import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file in the service root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Prioritize REQUEST_SUPABASE_URL and REQUEST_SUPABASE_KEY
const supabaseUrl = process.env.REQUEST_SUPABASE_URL || "";
const supabaseKey = process.env.REQUEST_SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Please set REQUEST_SUPABASE_URL and REQUEST_SUPABASE_KEY"
  );
}

console.log(`🔗 Request Service connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from("requests").select("id").limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

