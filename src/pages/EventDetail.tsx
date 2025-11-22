// src/pages/EventDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';
import { Calendar, Clock, MapPin, PoundSterling, ArrowLeft, Check, X } from 'lucide-react';
import type { Event, RSVP } from '../types/database';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [currentMember, setCurrentMember] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const fetchEventAndRSVP = async () => {
      try {
        // Get current user
        const userData = await getCurrentUser();
        if (!userData) {
          navigate('/');
          return;
        }
        setCurrentMember(userData.member);

        // Fetch event
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        // Fetch existing RSVP
        const { data: rsvpData } = await supabase
          .from('rsvps')
          .select('*')
          .eq('event_id', id)
          .eq('member_id', userData.member?.id)
          .single();

        setEvent(eventData);
        setRsvp(rsvpData);
      } catch (error) {
        console.error('Failed to load event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndRSVP();
  }, [id, navigate]);

  const handleRSVP = async (status: 'attending' | 'not_attending') => {
    if (!event || !currentMember) return;

    setResponding(true);
    try {
      if (rsvp) {
        // Update existing RSVP
        const { data: updatedRsvp } = await supabase
          .from('rsvps')
          .update({ 
            status, 
            responded_at: new Date().toISOString() 
          })
          .eq('id', rsvp.id)
          .select()
          .single();
        
        setRsvp(updatedRsvp);
      } else {
        // Create new RSVP
        const { data: newRsvp } = await supabase
          .from('rsvps')
          .insert({
            event_id: event.id,
            member_id: currentMember.id,
            status,
            responded_at: new Date().toISOString()
          })
          .select()
          .single();
        
        setRsvp(newRsvp);
      }
    } catch (error) {
      console.error('RSVP failed:', error);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-masonic-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Event not found</h3>
          <button
            onClick={() => navigate('/events')}
            className="text-masonic-blue hover:underline"
          >
            Return to events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-masonic-blue text-white p-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/events')} className="mr-3 p-1 hover:bg-blue-800 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Event Details</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h2>
          
          {event.description && (
            <p className="text-gray-700 mb-6">{event.description}</p>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-5 h-5 mr-3" />
              <span>{new Date(event.event_date).toLocaleDateString()}</span>
            </div>
            
            {event.event_time && (
              <div className="flex items-center text-gray-700">
                <Clock className="w-5 h-5 mr-3" />
                <span>{event.event_time}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-3" />
                <span>{event.venue}</span>
              </div>
            )}
            
            {event.cost_per_person && (
              <div className="flex items-center text-gray-700">
                <PoundSterling className="w-5 h-5 mr-3" />
                <span>£{event.cost_per_person} per person</span>
              </div>
            )}
          </div>

          {/* RSVP Status */}
          {rsvp && (
            <div className={`p-3 rounded-lg mb-4 ${
              rsvp.status === 'attending' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className="flex items-center">
                {rsvp.status === 'attending' ? <Check className="w-5 h-5 mr-2" /> : <X className="w-5 h-5 mr-2" />}
                <span className="font-medium">
                  You {rsvp.status === 'attending' ? 'are attending' : 'are not attending'} this event
                </span>
              </div>
            </div>
          )}

          {/* RSVP Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => handleRSVP('attending')}
              disabled={responding}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                rsvp?.status === 'attending'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {responding && rsvp?.status !== 'attending' ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-green-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Check className="w-5 h-5 mr-2" />
                  Attending
                </div>
              )}
            </button>

            <button
              onClick={() => handleRSVP('not_attending')}
              disabled={responding}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                rsvp?.status === 'not_attending'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              } disabled:opacity-50`}
            >
              {responding && rsvp?.status !== 'not_attending' ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-red-800 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <X className="w-5 h-5 mr-2" />
                  Not Attending
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;