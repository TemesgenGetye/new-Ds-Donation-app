import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "donor" | "recipient"
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for authentication state changes (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up realtime subscription for profile changes
  useEffect(() => {
    if (!user?.id) return;

    console.log("Setting up realtime subscription for user:", user.id);

    // Subscribe to changes in the profiles table for the current user
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Profile realtime update:", payload);

          if (payload.eventType === "UPDATE") {
            console.log("🔄 Updating profile with new data:", payload.new);
            setProfile(payload.new as Profile);
          } else if (payload.eventType === "INSERT") {
            console.log("➕ Inserting new profile:", payload.new);
            setProfile(payload.new as Profile);
          } else if (payload.eventType === "DELETE") {
            console.log("🗑️ Deleting profile");
            setProfile(null);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime subscription active for user:", user.id);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Realtime subscription error for user:", user.id);
        }
      });

    return () => {
      console.log("Cleaning up realtime subscription for user:", user.id);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows

      if (error) {
        console.error("Error fetching profile:", error);
        // If profile doesn't exist, this might be a new user
        if (error.code === "PGRST116") {
          console.log(
            "Profile not found, user might need to complete registration"
          );
        }
        throw error;
      }

      console.log("Profile fetched:", data);
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Don't throw error, just set profile to null
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "donor" | "recipient"
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) return { error };

      // Create profile
      if (data.user) {
        console.log("Creating profile for user:", data.user.id);
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role: role,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return { error: profileError };
        }

        // Fetch the newly created profile
        await fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      // Profile will be fetched in the auth state change listener
    } else {
      setLoading(false);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: "No user logged in" };

    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }

    return { error };
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
