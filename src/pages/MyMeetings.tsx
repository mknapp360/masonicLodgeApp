// src/pages/MyMeetings.tsx
import { useState, useEffect } from 'react';
import { useEvents } from '../hooks/useEvents';
import { getCurrentUser, signOut } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { User, Bell, LogOut, X, MapPin, Clock, Calendar as CalendarIcon, PoundSterling } from 'lucide-react';
import Calendar from '../components/Calendar';
import type { ChapterMeeting } from '../types/chapter-meetings';
import type { Event } from '../types/database';
import AppLayout from '../components/AppLayout';
import EventCard from '@/components/EventCard';

const MyMeetings = () => {
  const { events, loading: eventsLoading } = useEvents();
  const [currentMember, setCurrentMember] = useState<any>(null);
  const navigate = useNavigate();

  // Calendar-related state
  const [meetings, setMeetings] = useState<ChapterMeeting[]>([]);
  const [selectedMeetings, setSelectedMeetings] = useState<ChapterMeeting[]>([]);
  const [showModal, setShowModal] = useState(false);

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

  // Convert events to ChapterMeeting format for the calendar
  useEffect(() => {
    if (events.length > 0) {
      const convertedMeetings: ChapterMeeting[] = events.map((event: Event) => ({
        id: event.id,
        chapter_name: event.title,
        chapter_number: '', // Lodge events don't have a number like chapters do
        location_name: event.venue || '',
        address: event.venue || '',
        meeting_date: event.event_date,
        meeting_time: event.event_time,
        meeting_contact: null,
        meeting_type: 'regular' as const,
        published: true,
        area: null,
        notes: event.description,
        start_time: event.event_time,
        location: event.venue,
        created_at: '',
      }));
      setMeetings(convertedMeetings);
    } else {
      setMeetings([]);
    }
  }, [events]);

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

  // Get the original event data for a meeting
  const getEventData = (meetingId: string): Event | undefined => {
    return events.find(e => e.id === meetingId);
  };

  if (eventsLoading || !currentMember) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your meetings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="h-[70px] bg-masonic-blue text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">My Meetings</h1>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Booked Meetings</h2>
            {meetings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming meetings</h3>
                <p className="text-gray-600">You don't have any meetings booked yet.</p>
              </div>
            ) : (
              <Calendar
                meetings={meetings}
                onDateClick={handleDateClick}
                className="shadow-lg"
              />
            )}
          </div>
        </section>
      </div>

      {/* Lodge Events Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Meetings You Are Booked Into</h2>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-600">Check back later for new lodge events.</p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => navigate(`/event/${event.id}`)}
              />
            ))}
          </div>
        )}
      </div>

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
              {selectedMeetings.map((meeting) => {
                const eventData = getEventData(meeting.id);
                
                return (
                  <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                    {/* Event Title */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">
                          {meeting.chapter_name}
                        </h4>
                        {eventData?.description && (
                          <p className="text-sm text-gray-600 mt-1">{eventData.description}</p>
                        )}
                      </div>
                      <span className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Lodge Event
                      </span>
                    </div>

                    {/* Meeting Time */}
                    {meeting.meeting_time && (
                      <div className="flex items-center text-gray-700 mb-2">
                        <Clock className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">{meeting.meeting_time}</span>
                      </div>
                    )}

                    {/* Cost per person */}
                    {eventData?.cost_per_person && (
                      <div className="flex items-center text-gray-700 mb-2">
                        <PoundSterling className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">£{eventData.cost_per_person.toFixed(2)} per person</span>
                      </div>
                    )}

                    {/* Location with Google Maps Button */}
                    {meeting.location_name && (
                      <div className="flex items-start justify-between mt-2">
                        <div className="flex items-start flex-1">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{meeting.location_name}</p>
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

                    {/* View Details Button */}
                    <div className="mt-4">
                      <button
                        className="w-full py-3 px-4 bg-masonic-blue text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/event/${meeting.id}`);
                        }}
                      >
                        View Event Details
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MyMeetings;