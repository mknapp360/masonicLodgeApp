// src/hooks/useEvents.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/auth';
import type { Event } from '../types/database';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Get current authenticated user and their member data
        const userData = await getCurrentUser();
        
        if (!userData?.member?.id) {
          setLoading(false);
          return;
        }

        // Step 1: Get all lodges the user is a member of
        const { data: memberships, error: membershipError } = await supabase
          .from('member_lodge_memberships')
          .select('craft_lodge_id')
          .eq('member_id', userData.member.id)
          .eq('is_active', true);

        if (membershipError) {
          setError(membershipError.message);
          setLoading(false);
          return;
        }

        if (!memberships || memberships.length === 0) {
          setLoading(false);
          return;
        }

        // Step 2: Get all lodge IDs
        const lodgeIds = memberships.map(m => m.craft_lodge_id);

        // Step 3: Fetch events from all these lodges
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            craft_lodges (
              name,
              number
            )
          `)
          .in('lodge_id', lodgeIds)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true });

        if (error) {
          setError(error.message);
        } else if (data) {
          setEvents(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading, error };
};