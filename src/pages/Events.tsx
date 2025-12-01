// src/pages/Events.tsx
import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from '../services/auth';
import { royalArchSupabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

import { User, LogOut, X, MapPin, Clock } from 'lucide-react';
import Calendar from '../components/Calendar';
import type { ChapterMeeting } from '../types/chapter-meetings';
import AppLayout from '../components/AppLayout';

const Events = () => {
  const [currentMember, setCurrentMember] = useState<any>(null);
  const navigate = useNavigate();

  // Calendar-related state
  const [meetings, setMeetings] = useState<ChapterMeeting[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [selectedMeetings, setSelectedMeetings] = useState<ChapterMeeting[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('all');

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const member = getCurrentUser();
      if (!member) {
        navigate('/');
        return;
      }
      setCurrentMember(member);
    };

    checkAuth();
  }, [navigate]);

  // Load chapter meetings for calendar
  useEffect(() => {
    loadMeetings(selectedArea);
  }, [selectedArea]);

  async function loadMeetings(area: string = 'all') {
  setCalendarLoading(true);
  try {
    let query = royalArchSupabase
      .from('chapter_meetings')
      .select('*')
      .eq('published', true);

    // Apply area filter if not 'all'
    if (area !== 'all') {
      query = query.eq('area', area);
    }

    const { data, error } = await query.order('meeting_date', { ascending: true });

    if (error) throw error;

    if (data) {
      setMeetings(data as ChapterMeeting[]);
    }
  } catch (error) {
    console.error('Error loading meetings:', error);
  } finally {
    setCalendarLoading(false);
  }
}

  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedArea(event.target.value);
  };

  const handleDateClick = (_date: Date, dayMeetings: ChapterMeeting[]) => {
    setSelectedMeetings(dayMeetings);
    setShowModal(true);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Function to open Google Maps with the location
  const openGoogleMaps = (locationName: string, address: string) => {
    const fullLocation = address ? `${locationName}, ${address}` : locationName;
    const encodedLocation = encodeURIComponent(fullLocation);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    window.open(googleMapsUrl, '_blank');
  };

  

  return (
    <AppLayout>
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="h-[70px] bg-masonic-blue text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Lodge Events</h1>
            <p className="text-blue-200">Welcome, {currentMember?.masonic_rank} {currentMember?.last_name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/profile')} className="p-2 hover:bg-blue-800 rounded">
              <User className="w-5 h-5" />
            </button>
            <button onClick={handleSignOut} className="p-2 hover:bg-blue-800 rounded">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sussex Calendar (Currently Chapter only)</h2>
          {calendarLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading calendar...</p>
            </div>
          ) : (
            <Calendar
              meetings={meetings}
              onDateClick={handleDateClick}
              className="shadow-lg"
            />
          )}
        </div>

        <div className="container mx-auto px-4 pt-12 bg-slate-50 pb-8">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-headerText">
              Search For Meetings In Your Area
            </h2>
            <div className="h-1 w-32 bg-primary mx-auto"></div>
          </div>
        </div>

        {/* Area Filter Dropdown */}
      <div className="mb-6 flex justify-center bg-slate-50">
        <div className="w-full max-w-md">
          <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-2 text-center">
            Search by Area
          </label>
          <select
            id="area-filter"
            value={selectedArea}
            onChange={handleAreaChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-masonic-blue focus:border-transparent"
          >
            <option value="all">All Areas</option>
            <option value="1066">Near 1066</option>
            <option value="Brighton">Near Brighton</option>
            <option value="Chichester">Near Chichester</option>
            <option value="Crawley">Near Crawley</option>
            <option value="Eastbourne">Near Eastbourne</option>
            <option value="Worthing">Near Worthing</option>
          </select>
        </div>
      </div>
      </section>

      

      {/* Legend */}
      <section className="py-8 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-lg font-semibold mb-4 text-center">Meeting Types</h3>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Exaltation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Regular Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">Installation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-sm">Special Event</span>
            </div>
          </div>
        </div>
      </section>



      {/* Lodge Events Section */}
     

      {/* Modal for selected meetings */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Meetings on {selectedMeetings[0] && formatDate(selectedMeetings[0].meeting_date)}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {selectedMeetings.map((meeting) => (
                <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Chapter Name and Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">
                        {meeting.event_title || meeting.chapter_name}
                      </h4>
                      {!meeting.event_title && (
                      <p className="text-muted-foreground mb-4">
                        Chapter No. {meeting.chapter_number}
                      </p>
                    )}
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      meeting.meeting_type === 'exaltation' ? 'bg-red-100 text-red-800' :
                      meeting.meeting_type === 'installation' ? 'bg-purple-100 text-purple-800' :
                      meeting.meeting_type === 'special' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {meeting.meeting_type}
                    </span>
                  </div>

                  {/* Meeting Time */}
                  {meeting.meeting_time && (
                    <div className="flex items-center text-gray-700 mb-2">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm">{meeting.meeting_time}</span>
                    </div>
                  )}

                  {/* Location with Google Maps Button */}
                  {(meeting.location_name || meeting.address) && (
                    <div className="flex items-start justify-between mt-2">
                      <div className="flex items-start flex-1">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {meeting.location_name && (
                            <p className="font-medium">{meeting.location_name}</p>
                          )}
                          {meeting.address && (
                            <p className="text-gray-600">{meeting.address}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openGoogleMaps(meeting.location_name, meeting.address)}
                        className="ml-3 p-2 hover:bg-blue-50 rounded-full transition-colors group flex-shrink-0"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-5 h-5 text-masonic-blue group-hover:text-blue-700" />
                      </button>
                    </div>
                  )}

                  {/* Book Here Button */}
                  <div className="mt-4">
                    <button
                      className="w-full py-3 px-4 bg-masonic-blue text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
                      onClick={() => alert('Booking functionality coming soon!')}
                    >
                      Book Here (Coming Soon)
                    </button>
                  </div>

                  {/* Notes */}
                  {meeting.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {meeting.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
};

export default Events;