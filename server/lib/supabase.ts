import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BinType = 'biodegradable' | 'recyclable' | 'hazardous';

export interface SmartBin {
  id: string;
  bin_id: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  bin_type: BinType[];
  capacity: number;
  current_fill_level: number;
  status: 'active' | 'maintenance' | 'inactive';
  last_collection?: string;
  next_collection?: string;
  sensor_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BinCollection {
  id: string;
  bin_id: string;
  collector_id: string;
  collection_time: string;
  fill_level_at_collection: number;
  waste_type: BinType[];
  weight: number;
  notes?: string;
  created_at: string;
}