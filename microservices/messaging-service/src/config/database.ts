import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file in the service root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Use messaging-specific database credentials (new separate database)
const supabaseUrl = process.env.MESSAGING_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.MESSAGING_SUPABASE_KEY || process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Please set MESSAGING_SUPABASE_URL and MESSAGING_SUPABASE_KEY"
  );
}

// Log which database we're connecting to (masked for security)
const maskedUrl = supabaseUrl.replace(/\/\/.*@/, '//***@');
console.log(`🔗 Messaging Service connecting to: ${maskedUrl}`);

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from("messages").select("id").limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

