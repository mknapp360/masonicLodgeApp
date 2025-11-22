// src/pages/Events.tsx
import { useState, useEffect } from 'react';
import { useEvents } from '../hooks/useEvents';
import { getCurrentUser, signOut } from '../services/auth';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { Bell, User, LogOut, X } from 'lucide-react';
import Calendar from '../components/Calendar';
import type { ChapterMeeting } from '../types/chapter-meetings';

const Events = () => {
  const { events, loading: eventsLoading } = useEvents();
  const [currentMember, setCurrentMember] = useState<any>(null);
  const navigate = useNavigate();

  // Calendar-related state
  const [meetings, setMeetings] = useState<ChapterMeeting[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
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

  // Load chapter meetings for calendar
  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    setCalendarLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapter_meetings')
        .select('*')
        .eq('published', true)
        .order('meeting_date', { ascending: true });

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

  if (eventsLoading || !currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-masonic-blue text-white p-4">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Chapter Meetings Calendar</h2>
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
      </section>

      {/* Lodge Events Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Lodge Events</h2>
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
              {selectedMeetings.map((meeting) => (
                <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-2">
                    {meeting.chapter_name} - No. {meeting.chapter_number}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Type:</span> {meeting.meeting_type}</p>
                    {meeting.location && (
                      <p><span className="font-medium">Location:</span> {meeting.location}</p>
                    )}
                    {meeting.start_time && (
                      <p><span className="font-medium">Time:</span> {meeting.start_time}</p>
                    )}
                    {meeting.notes && (
                      <p className="mt-2"><span className="font-medium">Notes:</span> {meeting.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;