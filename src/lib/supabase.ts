// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Main app database (Craft Lodges - members, events, RSVPs)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Royal Arch database (Chapter Meetings - public calendar data)
const royalArchUrl = import.meta.env.VITE_ROYAL_ARCH_SUPABASE_URL
const royalArchAnonKey = import.meta.env.VITE_ROYAL_ARCH_SUPABASE_ANON_KEY

export const royalArchSupabase = createClient(royalArchUrl, royalArchAnonKey)