export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  masonic_rank?: string;
  primary_lodge_id?: string;
  push_token?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time: string;
  venue?: string;
  rsvp_deadline: string;
  cost_per_person: number;
  lodge_id: string;
}

export interface RSVP {
  id: string;
  event_id: string;
  member_id: string;
  status: 'attending' | 'not_attending' | 'pending';
  responded_at?: string;
}