// src/pages/ProvincialAnalytics.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Building2,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { getCurrentUser } from '@/services/auth';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface EventAnalytics {
  totalEvents: number;
  pastEvents: number;
  upcomingEvents: number;
  totalRSVPs: number;
  totalAttending: number;
  totalNotAttending: number;
  totalPending: number;
  averageAttendance: number;
  totalRevenue: number;
  lodgeBreakdown: LodgeAnalytics[];
  recentEvents: EventDetail[];
}

interface LodgeAnalytics {
  lodge_id: string;
  lodge_name: string;
  lodge_number: string;
  event_count: number;
  total_attending: number;
  avg_attendance: number;
}

interface EventDetail {
  id: string;
  title: string;
  event_date: string;
  venue: string;
  attending_count: number;
  not_attending_count: number;
  pending_count: number;
  total_responses: number;
  cost_per_person: number;
  revenue: number;
  lodge_name: string;
  lodge_number: string;
}

interface HistoricalStats {
  year: number;
  lodges_end_of_year: number;
  lodge_memberships_end_of_year: number;
  individual_members_end_of_year: number;
  initiated: number;
  resigned: number;
  ceased_excluded: number;
  deceased: number;
  honorary_members: number;
  joined_rejoined: number;
  net_gain_loss: number;
  individual_net_loss: number;
  late_return_adjustments: number;
  average_age_of_initiates: number;
}

const ProvincialAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30' | '90' | '365' | 'all'>('90');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user and their primary lodge
      const userData = await getCurrentUser();
      
      if (!userData?.member?.primary_lodge_id) {
        setError('No primary lodge found for user');
        setLoading(false);
        return;
      }

      // Get the user's primary lodge to find their provincial_lodge_id
      const { data: userLodge, error: userLodgeError } = await supabase
        .from('craft_lodges')
        .select('provincial_lodge_id')
        .eq('id', userData.member.primary_lodge_id)
        .single();

      if (userLodgeError) throw userLodgeError;

      if (!userLodge?.provincial_lodge_id) {
        setError('No provincial lodge found');
        setLoading(false);
        return;
      }

      const provincialLodgeId = userLodge.provincial_lodge_id;

      // Fetch historical provincial statistics for pitch (specific Sussex data)
      // Note: Each row represents the entire province's annual stats
      const historicalRowIds = [
        'e478c3f5-aa7d-4886-94ce-362780ddac09', // 2021
        'a7e6d3d3-f7a1-493a-814e-9fa7c51f47c7', // 2022
        '3aff553a-43d8-4352-ac7d-de2859bae118'  // 2023
      ];

      const { data: historicalStatsData, error: historicalError } = await supabase
        .from('provincial_annual_stats')
        .select('*')
        .in('id', historicalRowIds)
        .order('year', { ascending: true });

      console.log('Historical Stats Query:', {
        data: historicalStatsData,
        error: historicalError
      });

      if (!historicalError && historicalStatsData) {
        setHistoricalData(historicalStatsData);
      }

      // Calculate date threshold based on selected range
      const today = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '30':
          startDate.setDate(today.getDate() - 30);
          break;
        case '90':
          startDate.setDate(today.getDate() - 90);
          break;
        case '365':
          startDate.setDate(today.getDate() - 365);
          break;
        case 'all':
          startDate = new Date('2000-01-01'); // Far past date
          break;
      }

      const dateThreshold = startDate.toISOString().split('T')[0];

      // Step 1: Fetch all events from lodges in the same province
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_date,
          event_time,
          venue,
          cost_per_person,
          lodge_id,
          craft_lodges!inner (
            id,
            name,
            number,
            provincial_lodge_id
          )
        `)
        .eq('craft_lodges.provincial_lodge_id', provincialLodgeId)
        .gte('event_date', dateThreshold)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      if (!eventsData || eventsData.length === 0) {
        setAnalytics({
          totalEvents: 0,
          pastEvents: 0,
          upcomingEvents: 0,
          totalRSVPs: 0,
          totalAttending: 0,
          totalNotAttending: 0,
          totalPending: 0,
          averageAttendance: 0,
          totalRevenue: 0,
          lodgeBreakdown: [],
          recentEvents: [],
        });
        setLoading(false);
        return;
      }

      // Step 2: For each event, count attendance from all tables
      const eventIds = eventsData.map(e => e.id);

      // Count member RSVPs by event and status
      const { data: memberRsvpsData } = await supabase
        .from('rsvps')
        .select('id, event_id, status')
        .in('event_id', eventIds);

      // Count visitors by event
      const { data: visitorsData } = await supabase
        .from('visitor_rsvps')
        .select('id, event_id')
        .in('event_id', eventIds);

      // Get all RSVP IDs to find their guests
      const rsvpIds = memberRsvpsData?.map(r => r.id) || [];
      
      // Count guests linked to those RSVPs
      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, rsvp_id')
        .in('rsvp_id', rsvpIds);

      // Get all visitor RSVP IDs to find their additional guests
      const visitorRsvpIds = visitorsData?.map(v => v.id) || [];

      // Count additional guests linked to visitor RSVPs
      const { data: additionalGuestsData } = await supabase
        .from('visitor_additional_guests')
        .select('id, visitor_rsvp_id')
        .in('visitor_rsvp_id', visitorRsvpIds);

      // Step 3: Build mappings
      // Map rsvp_id to event_id for guests
      const rsvpToEvent = new Map<string, string>();
      memberRsvpsData?.forEach((rsvp: any) => {
        rsvpToEvent.set(rsvp.id, rsvp.event_id);
      });

      // Map visitor_rsvp_id to event_id for additional guests
      const visitorRsvpToEvent = new Map<string, string>();
      visitorsData?.forEach((visitor: any) => {
        visitorRsvpToEvent.set(visitor.id, visitor.event_id);
      });

      // Step 4: Build count maps by event_id
      const memberAttendingByEvent = new Map<string, number>();
      const memberNotAttendingByEvent = new Map<string, number>();
      const memberPendingByEvent = new Map<string, number>();
      const visitorsByEvent = new Map<string, number>();
      const guestsByEvent = new Map<string, number>();
      const additionalGuestsByEvent = new Map<string, number>();

      // Count member RSVPs by status
      memberRsvpsData?.forEach((rsvp: any) => {
        if (rsvp.status === 'attending') {
          memberAttendingByEvent.set(rsvp.event_id, (memberAttendingByEvent.get(rsvp.event_id) || 0) + 1);
        } else if (rsvp.status === 'not_attending') {
          memberNotAttendingByEvent.set(rsvp.event_id, (memberNotAttendingByEvent.get(rsvp.event_id) || 0) + 1);
        } else if (rsvp.status === 'pending') {
          memberPendingByEvent.set(rsvp.event_id, (memberPendingByEvent.get(rsvp.event_id) || 0) + 1);
        }
      });

      // Count visitors
      visitorsData?.forEach((visitor: any) => {
        visitorsByEvent.set(visitor.event_id, (visitorsByEvent.get(visitor.event_id) || 0) + 1);
      });

      // Count guests - map through rsvp_id to event_id
      guestsData?.forEach((guest: any) => {
        const eventId = rsvpToEvent.get(guest.rsvp_id);
        if (eventId) {
          guestsByEvent.set(eventId, (guestsByEvent.get(eventId) || 0) + 1);
        }
      });

      // Count additional guests - map through visitor_rsvp_id to event_id
      additionalGuestsData?.forEach((ag: any) => {
        const eventId = visitorRsvpToEvent.get(ag.visitor_rsvp_id);
        if (eventId) {
          additionalGuestsByEvent.set(eventId, (additionalGuestsByEvent.get(eventId) || 0) + 1);
        }
      });

      // Process the data
      const now = new Date();
      const pastEvents: EventDetail[] = [];
      const lodgeMap = new Map<string, LodgeAnalytics>();
      
      let totalEvents = 0;
      let pastEventsCount = 0;
      let upcomingEventsCount = 0;
      let totalRSVPs = 0;
      let totalAttending = 0;
      let totalNotAttending = 0;
      let totalPending = 0;
      let totalRevenue = 0;

      // Step 4: Process each event with the counts
      eventsData?.forEach((event: any) => {
        totalEvents++;
        const eventDate = new Date(event.event_date);
        const isPast = eventDate < now;

        if (isPast) {
          pastEventsCount++;
        } else {
          upcomingEventsCount++;
        }

        // Get counts for this specific event from our maps
        const membersAttending = memberAttendingByEvent.get(event.id) || 0;
        const notAttending = memberNotAttendingByEvent.get(event.id) || 0;
        const pending = memberPendingByEvent.get(event.id) || 0;
        const visitorsCount = visitorsByEvent.get(event.id) || 0;
        const guestsCount = guestsByEvent.get(event.id) || 0;
        const additionalGuestsCount = additionalGuestsByEvent.get(event.id) || 0;

        // Total actual attendance = members + visitors + guests + additional guests
        const totalEventAttendance = membersAttending + visitorsCount + guestsCount + additionalGuestsCount;
        const totalResponses = membersAttending + notAttending + pending;

        totalRSVPs += totalResponses;
        totalAttending += totalEventAttendance; // This is the real attendance number
        totalNotAttending += notAttending;
        totalPending += pending;

        // Calculate revenue only for past events (based on actual attendance)
        if (isPast) {
          const eventRevenue = totalEventAttendance * (event.cost_per_person || 0);
          totalRevenue += eventRevenue;

          // Add to recent events list
          pastEvents.push({
            id: event.id,
            title: event.title,
            event_date: event.event_date,
            venue: event.venue || '',
            attending_count: totalEventAttendance, // Show total attendance (members + visitors + guests + additional)
            not_attending_count: notAttending,
            pending_count: pending,
            total_responses: totalResponses,
            cost_per_person: event.cost_per_person || 0,
            revenue: eventRevenue,
            lodge_name: event.craft_lodges?.name || 'Unknown',
            lodge_number: event.craft_lodges?.number || '',
          });
        }

        // Update lodge breakdown with total attendance
        const lodgeId = event.lodge_id;
        if (lodgeId && event.craft_lodges) {
          if (!lodgeMap.has(lodgeId)) {
            lodgeMap.set(lodgeId, {
              lodge_id: lodgeId,
              lodge_name: event.craft_lodges.name,
              lodge_number: event.craft_lodges.number,
              event_count: 0,
              total_attending: 0,
              avg_attendance: 0,
            });
          }

          const lodgeData = lodgeMap.get(lodgeId)!;
          lodgeData.event_count++;
          lodgeData.total_attending += totalEventAttendance; // Use total attendance
        }
      });

      // Calculate averages for lodges
      const lodgeBreakdown = Array.from(lodgeMap.values()).map(lodge => ({
        ...lodge,
        avg_attendance: lodge.event_count > 0 
          ? Math.round(lodge.total_attending / lodge.event_count) 
          : 0,
      }));

      // Sort by event count
      lodgeBreakdown.sort((a, b) => b.event_count - a.event_count);

      // Sort past events by date (most recent first)
      pastEvents.sort((a, b) => 
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );

      // Calculate average attendance
      const averageAttendance = pastEventsCount > 0
        ? Math.round(totalAttending / pastEventsCount)
        : 0;

      setAnalytics({
        totalEvents,
        pastEvents: pastEventsCount,
        upcomingEvents: upcomingEventsCount,
        totalRSVPs,
        totalAttending,
        totalNotAttending,
        totalPending,
        averageAttendance,
        totalRevenue,
        lodgeBreakdown,
        recentEvents: pastEvents.slice(0, 10), // Top 10 most recent
      });

    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-masonic-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Provincial Analytics</h1>
                <p className="text-gray-600 mt-1">Real-time engagement insights & historical trends</p>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2">
            {[
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
              { value: '365', label: 'Last Year' },
              { value: 'all', label: 'All Time' },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === range.value
                    ? 'bg-masonic-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Historical Provincial Statistics - NEW SECTION */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-6 h-6 mr-2 text-masonic-blue" />
            <h2 className="text-xl font-bold text-gray-900">
              Historical Provincial Statistics (Annual Data)
            </h2>
          </div>
          
          {historicalData.length === 0 ? (
            <div className="text-center py-8 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No historical data found</p>
              <p className="text-sm text-gray-600 mt-2">
                Make sure the <code className="bg-gray-200 px-2 py-1 rounded">provincial_annual_stats</code> table exists and has data.
              </p>
              <p className="text-xs text-gray-500 mt-2">Check browser console for debugging info</p>
            </div>
          ) : (
            <>
            {/* Year-over-Year Comparison Table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                      Metric
                    </th>
                    {historicalData.map(year => (
                      <th key={year.year} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {year.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Lodges */}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-blue-50">
                      Total Lodges
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-gray-900">
                        {year.lodges_end_of_year}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Individual Members */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-white">
                      Individual Members
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                        {year.individual_members_end_of_year?.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-red-50">
                      Net Loss vs Prior Year
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center font-bold text-red-600">
                        {year.individual_net_loss}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Initiates */}
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-green-50">
                      New Initiates
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center font-bold text-green-600">
                        +{year.initiated}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Joined/Rejoined */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Joined / Re-joined
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-green-600">
                        +{year.joined_rejoined}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Resignations */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Resignations
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-red-600">
                        -{year.resigned}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Ceased/Excluded */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Ceased / Excluded
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-orange-600">
                        -{year.ceased_excluded}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Deceased */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Deceased
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-gray-600">
                        -{year.deceased}
                      </td>
                    ))}
                  </tr>

                  {/* Honorary Members */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Honorary Members
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-gray-600">
                        -{year.honorary_members}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Late Return Adjustments - CRITICAL METRIC */}
                  <tr className="bg-yellow-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-yellow-50">
                      Late Return Adjustments
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center font-bold text-yellow-700">
                        {year.late_return_adjustments}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Average Age of Initiates */}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                      Avg Age of Initiates
                    </td>
                    {historicalData.map(year => (
                      <td key={year.year} className="px-4 py-3 text-sm text-center text-gray-900">
                        {year.average_age_of_initiates?.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Individual Membership Decline Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">Individual Membership Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[3600, 4000]} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="individual_members_end_of_year" 
                      stroke="#dc2626" 
                      fill="#fecaca" 
                      name="Individual Members"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-red-600 font-medium mt-2">
                  ↓ {historicalData[0]?.individual_members_end_of_year - 
                     historicalData[historicalData.length - 1]?.individual_members_end_of_year} members lost (
                  {(((historicalData[0]?.individual_members_end_of_year - 
                      historicalData[historicalData.length - 1]?.individual_members_end_of_year) / 
                      historicalData[0]?.individual_members_end_of_year) * 100).toFixed(1)}% decline)
                </p>
              </div>

              {/* THE HIDDEN CRISIS: Individual vs Lodge Memberships Divergence */}
              <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  🔍 The Hidden Crisis: Membership Ratio
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historicalData.map(year => ({
                    year: year.year,
                    individuals: year.individual_members_end_of_year,
                    lodge_memberships: year.lodge_memberships_end_of_year,
                    ratio: (year.lodge_memberships_end_of_year / year.individual_members_end_of_year).toFixed(2)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" domain={[3500, 5000]} />
                    <YAxis yAxisId="right" orientation="right" domain={[1.1, 1.25]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="individuals" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      name="Individual Members (↓)"
                      dot={{ fill: '#dc2626', r: 5 }}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="lodge_memberships" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      name="Lodge Memberships (stable)"
                      dot={{ fill: '#2563eb', r: 5 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="ratio" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      name="Ratio (↑)"
                      dot={{ fill: '#f59e0b', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-amber-900 font-semibold mt-2">
                  Members declining, but ratio INCREASING - same people joining more lodges
                </p>
              </div>

              {/* Initiations vs Losses Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">Gains vs Losses</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="initiated" fill="#22c55e" name="Initiated" />
                    <Bar dataKey="joined_rejoined" fill="#86efac" name="Joined/Rejoined" />
                    <Bar dataKey="resigned" fill="#dc2626" name="Resigned" />
                    <Bar dataKey="ceased_excluded" fill="#f97316" name="Ceased/Excluded" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* THE INITIATION PARADOX */}
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  ❓ The Initiation Paradox
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="initiated" fill="#22c55e" name="New Initiates (↑)" />
                    <Bar 
                      dataKey={(data) => Math.abs(data.individual_net_loss)} 
                      fill="#dc2626" 
                      name="Net Individual Loss"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-purple-900 font-semibold mt-2">
                  Initiations UP 56%, but still losing members - where are they going?
                </p>
              </div>

              {/* ACCELERATION OF LOSSES */}
              <div className="bg-rose-50 p-4 rounded-lg border-2 border-rose-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  📈 Loss Rate Accelerating
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { period: '2021→2022', loss: 116, rate: 2.9 },
                    { period: '2022→2023', loss: 139, rate: 3.6 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="loss" fill="#dc2626" name="Members Lost" />
                    <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={3} name="Loss Rate %" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-rose-900 font-semibold mt-2">
                  Loss rate increased 20% - problem is getting worse, not better
                </p>
              </div>

              {/* CEASED/EXCLUDED CRISIS */}
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  ⚡ Ceased/Excluded Spike
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="ceased_excluded" fill="#f97316" name="Ceased/Excluded">
                      {historicalData.map((_entry, _index) => {
                        // Calculate percentage change from first year
                        return null;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-orange-900 font-semibold mt-2">
                  2021: 32 → 2022: 124 (287% increase!) → 2023: 100 - What happened?
                </p>
              </div>

              {/* Late Return Adjustments - THE KEY METRIC */}
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  ⚠️ Data Latency Crisis: Late Return Adjustments
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="late_return_adjustments" fill="#eab308" name="Late Adjustments" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-yellow-900 font-semibold mt-2">
                  174 membership changes discovered months after they occurred in 2023
                </p>
              </div>

              {/* Net Losses Comparison */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">Annual Net Loss</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="individual_net_loss" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      name="Net Loss"
                      dot={{ fill: '#dc2626', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-600 font-medium mt-2">
                  Despite increased initiations, net losses continue
                </p>
              </div>
            </div>

            {/* Key Insights Box */}
            <div className="p-4 bg-blue-50 border-l-4 border-masonic-blue rounded">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Key Insights from Historical Data</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <strong>Individual membership declining:</strong> Lost{' '}
                  {historicalData[0]?.individual_members_end_of_year - 
                   historicalData[historicalData.length - 1]?.individual_members_end_of_year} members from{' '}
                  {historicalData[0]?.year} to {historicalData[historicalData.length - 1]?.year}
                  {' '}({(((historicalData[0]?.individual_members_end_of_year - 
                      historicalData[historicalData.length - 1]?.individual_members_end_of_year) / 
                      historicalData[0]?.individual_members_end_of_year) * 100).toFixed(1)}% decline)
                </li>
                <li>
                  <strong>Initiation success:</strong> Increased initiates from {historicalData[0]?.initiated} to{' '}
                  {historicalData[historicalData.length - 1]?.initiated} 
                  {' '}(+{(((historicalData[historicalData.length - 1]?.initiated - 
                      historicalData[0]?.initiated) / 
                      historicalData[0]?.initiated) * 100).toFixed(0)}%)
                </li>
                <li className="text-red-600 font-semibold">
                  <strong>Data latency crisis:</strong> Late return adjustments increased from{' '}
                  {historicalData[0]?.late_return_adjustments} to{' '}
                  {historicalData[historicalData.length - 1]?.late_return_adjustments} - 
                  representing {Math.abs(historicalData[historicalData.length - 1]?.late_return_adjustments || 0)} membership 
                  changes discovered months after they occurred
                </li>
                <li>
                  <strong>Retention challenge:</strong> Despite recruiting{' '}
                  {historicalData.reduce((sum, year) => sum + year.initiated, 0)} new initiates over{' '}
                  {historicalData.length} years, net loss is{' '}
                  {historicalData[0]?.individual_members_end_of_year - 
                   historicalData[historicalData.length - 1]?.individual_members_end_of_year} members
                </li>
              </ul>
            </div>

            {/* What Real-Time Intelligence Would Show */}
            <div className="mt-6 p-4 bg-masonic-blue/10 border-l-4 border-masonic-blue rounded">
              <h3 className="font-semibold text-gray-900 mb-2">💡 What Real-Time Intelligence Would Reveal</h3>
              <p className="text-sm text-gray-700 mb-3">
                This historical data shows the <strong>outcome</strong> - but with our platform, you would see the <strong>process</strong> as it unfolds:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Early warning:</strong> Identify at-risk members 90+ days before resignation</li>
                <li>• <strong>Behavioral patterns:</strong> See declining attendance trends before members ghost completely</li>
                <li>• <strong>Lodge health scores:</strong> Know which lodges are struggling months before closure becomes necessary</li>
                <li>• <strong>Zero latency:</strong> No more "late return adjustments" - every change visible instantly</li>
                <li>• <strong>Retention analysis:</strong> Track which lodges retain new initiates and learn from their success</li>
              </ul>
            </div>
            </>
          )}
        </div>

        {/* Key Metrics - EXISTING SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.pastEvents} past, {analytics.upcomingEvents} upcoming
                </p>
              </div>
              <Calendar className="w-10 h-10 text-masonic-blue opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Attendance</p>
                <p className="text-3xl font-bold text-green-600">{analytics.totalAttending}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {analytics.averageAttendance} per event
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Responses</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalRSVPs}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.totalPending} pending
                </p>
              </div>
              <Users className="w-10 h-10 text-masonic-blue opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(analytics.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">From past events</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* RSVP Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">RSVP Breakdown</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{analytics.totalAttending}</p>
              <p className="text-sm text-gray-600">Attending</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.totalRSVPs > 0 
                  ? Math.round((analytics.totalAttending / analytics.totalRSVPs) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{analytics.totalNotAttending}</p>
              <p className="text-sm text-gray-600">Not Attending</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.totalRSVPs > 0 
                  ? Math.round((analytics.totalNotAttending / analytics.totalRSVPs) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-600">{analytics.totalPending}</p>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.totalRSVPs > 0 
                  ? Math.round((analytics.totalPending / analytics.totalRSVPs) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Lodge Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-6 h-6 mr-2" />
            Lodge Performance
          </h2>
          {analytics.lodgeBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lodge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Attendance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Attendance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.lodgeBreakdown.map((lodge) => (
                    <tr key={lodge.lodge_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {lodge.lodge_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          No. {lodge.lodge_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lodge.event_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lodge.total_attending}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {lodge.avg_attendance}
                          </span>
                          {lodge.avg_attendance >= analytics.averageAttendance ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No lodge data available</p>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Past Events</h2>
          {analytics.recentEvents.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-masonic-blue transition-colors cursor-pointer"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {event.lodge_name} No. {event.lodge_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(event.event_date)}
                      </p>
                      <p className="text-xs text-gray-500">{event.venue}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {event.attending_count}
                      </p>
                      <p className="text-xs text-gray-600">Attended</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">
                        {event.not_attending_count}
                      </p>
                      <p className="text-xs text-gray-600">Declined</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-600">
                        {event.total_responses}
                      </p>
                      <p className="text-xs text-gray-600">Total RSVPs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-masonic-blue">
                        {formatCurrency(event.revenue)}
                      </p>
                      <p className="text-xs text-gray-600">Revenue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No past events found</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProvincialAnalytics;