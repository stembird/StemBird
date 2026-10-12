import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "employer" | "candidate" | "admin" | null;

const ROLE_PRIORITY: Record<Exclude<UserRole, null>, number> = {
  admin: 3,
  employer: 2,
  candidate: 1,
};

function pickPrimaryRole(roles: string[]): UserRole {
  let best: UserRole = null;
  let bestScore = 0;
  for (const role of roles) {
    if (role !== "admin" && role !== "employer" && role !== "candidate") continue;
    const score = ROLE_PRIORITY[role];
    if (score > bestScore) {
      best = role;
      bestScore = score;
    }
  }
  return best;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // Read from canonical user_roles. Prefer admin > employer > candidate
      // when a user somehow has multiple rows.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data && data.length > 0) {
        setRole(pickPrimaryRole(data.map((row) => row.role)));
        return;
      }

      // Fallback: security-definer admin check (covers restrictive RLS edge cases)
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (isAdmin) {
        setRole("admin");
        return;
      }

      if (error) {
        console.error("Error fetching user role:", error);
      }
      setRole(null);
    } catch (err) {
      console.error("Unexpected error fetching user role:", err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { role, loading };
};
