// src/types/chapter-meetings.ts
// TypeScript interfaces for the Chapter Meetings system

/**
 * Meeting types for color coding in calendar
 */
export type MeetingType = 'regular' | 'exaltation' | 'installation' | 'special';

/**
 * Complete ChapterMeeting interface matching the database schema
 */
export interface ChapterMeeting {
  event_title: string;
  notes: any;
  start_time: any;
  location: any;
  id: string;
  chapter_name: string;
  chapter_number: string;
  location_name: string;
  address: string;
  meeting_date: string; // ISO date string
  meeting_time: string;
  meeting_contact: string | null;
  meeting_type: MeetingType;
  published: boolean;
  area: string | null; // Area filter (e.g., "1066", "Brighton", "Chichester", "Worthing", "Crawley", "Eastbourne")
  location_id?: string | null;
  generated_from_rule_id?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Calendar day with meetings
 */
export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: ChapterMeeting[];
}

/**
 * Form data for creating/editing chapter meetings
 */
export interface ChapterMeetingFormData {
  chapter_name: string;
  chapter_number: string;
  location_name: string;
  address: string;
  meeting_date: string;
  meeting_time: string;
  meeting_contact?: string;
  meeting_type?: MeetingType;
  published?: boolean;
}

/**
 * Supabase query result type
 */
export type ChapterMeetingsQueryResult = {
  data: ChapterMeeting[] | null;
  error: Error | null;
};