import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as UserRole) ?? "staff";
}

async function buildAppUser(authUser: User): Promise<AppUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", authUser.id)
    .maybeSingle();

  const role = await fetchUserRole(authUser.id);

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.email?.split("@")[0] || "User",
    email: authUser.email || "",
    role,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Persists across effect re-runs (e.g. React StrictMode double-invoke) so
  // the generation counter is never accidentally reset to 0.
  const authGenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    // Called on SIGNED_OUT to remove any leftover auth tokens from storage.
    // Supabase v2 never throws for expired sessions — it fires SIGNED_OUT
    // asynchronously, so we must clear here rather than in a catch block.
    const clearAuthStorage = () => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.error("Failed to clear auth storage", error);
      }
    };

    // Incremented on every auth-state-change event so that stale hydrateUser
    // calls (e.g. from USER_UPDATED fired just before SIGNED_OUT) cannot
    // overwrite the user state set by a later event.
    const hydrateUser = async (authUser: User, gen: number) => {
      try {
        const appUser = await buildAppUser(authUser);
        if (!cancelled && authGenRef.current === gen) setUser(appUser);
      } catch (error) {
        console.error("Failed to load user profile/role, falling back to auth user", error);
        if (!cancelled && authGenRef.current === gen) {
          setUser({
            id: authUser.id,
            name: authUser.email?.split("@")[0] || "User",
            email: authUser.email || "",
            role: "staff",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Supabase v2 fires INITIAL_SESSION immediately on subscription, delivering
    // the current session state. Using only onAuthStateChange (no separate
    // getSession() call) eliminates the race condition where two concurrent
    // initializers increment the generation counter against each other, which
    // could leave loading=false but user=null even when a valid session exists.
    //
    // The callback is intentionally synchronous (not async). Supabase v2
    // awaits async auth-state-change listeners before resolving operations
    // like updateUser/signOut. Keeping this callback sync means those
    // operations resolve immediately and don't block on our DB queries.
    // hydrateUser runs in the background and calls setLoading(false) when done.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const gen = ++authGenRef.current;
        if (session?.user) {
          hydrateUser(session.user, gen);
        } else {
          if (event === "SIGNED_OUT") {
            // Proactively clear stale tokens so the next page load starts clean.
            clearAuthStorage();
          }
          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    setUser(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Failed to sign out locally", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
