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
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { getCurrentUser } from '@/services/auth';

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

const ProvincialAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
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
                <p className="text-gray-600 mt-1">Event and attendance insights</p>
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

        {/* Key Metrics */}
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