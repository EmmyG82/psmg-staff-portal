import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  useEffect(() => {
    let cancelled = false;
    // Incremented on every auth-state-change event so that stale hydrateUser
    // calls (e.g. from USER_UPDATED fired just before SIGNED_OUT) cannot
    // overwrite the user state set by a later event.
    let currentGen = 0;

    const clearCorruptAuthStorage = () => {
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

    const hydrateUser = async (authUser: User, gen: number) => {
      try {
        const appUser = await buildAppUser(authUser);
        if (!cancelled && currentGen === gen) setUser(appUser);
      } catch (error) {
        console.error("Failed to load user profile/role, falling back to auth user", error);
        if (!cancelled && currentGen === gen) {
          setUser({
            id: authUser.id,
            name: authUser.email?.split("@")[0] || "User",
            email: authUser.email || "",
            role: "staff",
          });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const gen = ++currentGen;
        try {
          if (session?.user) {
            await hydrateUser(session.user, gen);
          } else if (!cancelled) {
            setUser(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    );

    const initializeSession = async () => {
      const gen = ++currentGen;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await hydrateUser(session.user, gen);
        }
      } catch (error) {
        console.error("Failed to restore session; clearing local auth storage", error);
        clearCorruptAuthStorage();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initializeSession();

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
    await supabase.auth.signOut();
    setUser(null);
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
