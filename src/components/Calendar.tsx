// src/components/Calendar.tsx
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import type { ChapterMeeting, CalendarDay } from '../types/chapter-meetings';

interface CalendarProps {
  meetings: ChapterMeeting[];
  onDateClick?: (date: Date, meetings: ChapterMeeting[]) => void;
  className?: string;
  areaFilter?: string | null; // Optional area filter (e.g., "1066", "Brighton", "Chichester")
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar({ meetings, onDateClick, className = '', areaFilter = null }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter meetings by area if areaFilter is provided
  const filteredMeetings = useMemo(() => {
    if (!areaFilter) return meetings;
    
    return meetings.filter(meeting => {
      const meetingArea = (meeting as any).area;
      return meetingArea && meetingArea.toLowerCase() === areaFilter.toLowerCase();
    });
  }, [meetings, areaFilter]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

 

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    
    // Start from Monday
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    // Adjust to Monday (0 = Sunday, 1 = Monday, etc.)
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    // Generate 42 days (6 weeks) for consistent grid
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      
      // Filter meetings for this date
      const dayMeetings = filteredMeetings.filter(m => m.meeting_date === dateString);
      
      days.push({
        date,
        dateString,
        isCurrentMonth,
        isToday,
        meetings: dayMeetings
      });
    }
    
    return days;
  }, [currentDate, filteredMeetings]);

  // Get meeting color based on type
  const getMeetingColor = (type: string) => {
    switch (type) {
      case 'exaltation':
        return 'bg-red-500 text-white';
      case 'installation':
        return 'bg-purple-500 text-white';
      case 'special':
        return 'bg-amber-500 text-white';
      default: // regular
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="text-white hover:bg-purple-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            
            <h2 className="text-xl font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="text-white hover:bg-purple-700"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b bg-slate-50">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-slate-600 border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={`${day.dateString}-${index}`}
            className={`min-h-[100px] p-2 border-r border-b last:border-r-0 ${
              !day.isCurrentMonth ? 'bg-slate-50' : ''
            } ${
              day.isToday ? 'bg-blue-50' : ''
            } ${
              day.meetings.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''
            }`}
            onClick={() => {
              if (day.meetings.length > 0 && onDateClick) {
                onDateClick(day.date, day.meetings);
              }
            }}
          >
            {/* Date number */}
            <div className={`text-sm mb-1 ${
              !day.isCurrentMonth ? 'text-slate-400' : 'text-slate-700'
            } ${
              day.isToday ? 'font-bold' : ''
            }`}>
              {day.date.getDate()}
            </div>

            {/* Meeting indicators */}
            <div className="space-y-1">
              {day.meetings.map(meeting => (
                <div
                  key={meeting.id}
                  className={`text-xs p-1 rounded truncate ${getMeetingColor(meeting.meeting_type)}`}
                  title={`${meeting.chapter_name} - ${meeting.chapter_number}`}
                >
                  {meeting.chapter_name} - No. {meeting.chapter_number}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}