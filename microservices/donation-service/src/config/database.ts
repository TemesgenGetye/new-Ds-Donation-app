import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the service root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('donations').select('id').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

