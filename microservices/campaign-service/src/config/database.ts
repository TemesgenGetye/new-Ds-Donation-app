import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file in the service root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Campaign service uses its own separate Supabase database
// MUST use CAMPAIGN_SUPABASE_URL - no fallback to old database
const supabaseUrl = process.env.CAMPAIGN_SUPABASE_URL || "";
const supabaseKey = process.env.CAMPAIGN_SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Campaign service REQUIRES CAMPAIGN_SUPABASE_URL and CAMPAIGN_SUPABASE_KEY"
  );
}

// Log which database we're connecting to (for debugging)
console.log(`🔗 Campaign Service connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);
export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from("campaigns").select("id").limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};
