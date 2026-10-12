import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the configured admin email's denormalized profile role in sync.
  // Canonical grants live in user_roles and must be set via service role / SQL —
  // the client must never self-assign admin.
  // Comma-separated allowlist for profile-role sync only. Canonical admin
  // grants still live in user_roles and must be set via service role / SQL.
  const ADMIN_EMAILS_RAW =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    "ejuma90@gmail.com,comfonex@gmail.com";

  const ensureAdminRole = useCallback(async (u: User | null) => {
    try {
      if (!u?.email) return;
      const adminEmails = ADMIN_EMAILS_RAW.split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      if (!adminEmails.includes(u.email.toLowerCase())) return;

      const { data: existingAdmin } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!existingAdmin) {
        // Do not insert admin from the browser — that is a privilege-escalation path.
        console.warn(
          "Configured admin email is signed in but has no user_roles.admin row. Grant admin via service role/SQL."
        );
        return;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ role: "admin" })
        .eq("id", u.id);
      if (profileError) {
        console.error("Failed to sync admin profile role:", profileError);
      }
    } catch (err) {
      console.error("Unexpected error ensuring admin role:", err);
    }
  }, [ADMIN_EMAILS_RAW]);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            
            setSession(session);
            setUser(session?.user ?? null);
            // Only ensure admin role on sign-in events, not sign-out
            if (event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') {
              ensureAdminRole(session?.user ?? null);
            }
            setLoading(false);
          }
        );

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        // Ensure admin role on initial load
        ensureAdminRole(session?.user ?? null);
        // Only set loading to false after processing
        setLoading(false);

        return () => {
          mounted = false;
          try {
            subscription.unsubscribe();
          } catch (error) {
            console.debug('Error unsubscribing from auth:', error);
          }
        };
      } catch (error) {
        console.debug('Error setting up auth listener:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [ensureAdminRole]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};