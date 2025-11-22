import { Calendar, Clock, MapPin, PoundSterling, Building2 } from 'lucide-react';
import type { Event } from '../types/database';

interface EventCardProps {
  event: Event & {
    craft_lodges?: {
      name: string;
      number: string;
    };
  };
  onPress: () => void;
}

const EventCard = ({ event, onPress }: EventCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div 
      onClick={onPress}
      className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
      
      {/* Lodge information */}
      {event.craft_lodges && (
        <div className="flex items-center mb-3 px-2 py-1 bg-masonic-blue/10 rounded-md w-fit">
          <Building2 className="w-4 h-4 mr-2 text-masonic-blue" />
          <span className="text-sm font-medium text-masonic-blue">
            {event.craft_lodges.name} No. {event.craft_lodges.number}
          </span>
        </div>
      )}
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{formatDate(event.event_date)}</span>
        </div>
        
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          <span>{event.event_time}</span>
        </div>
        
        {event.venue && (
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.venue}</span>
          </div>
        )}
        
        <div className="flex items-center">
          <PoundSterling className="w-4 h-4 mr-2" />
          <span>£{event.cost_per_person}</span>
        </div>
      </div>
    </div>
  );
};

export default EventCard;