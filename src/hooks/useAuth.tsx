import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifierToAuthEmail, isEmailIdentifier } from "@/lib/phone";

type AppRole = "admin" | "staff" | "client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: {
    full_name: string;
    email: string;
    company_name: string;
    phone: string;
  } | null;
  loading: boolean;
  // identifier may be an email address OR a phone number (phone logins are
  // keyed to a synthetic email under the hood — see src/lib/phone.ts).
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
        supabase.from("profiles").select("full_name, email, company_name, phone").eq("user_id", userId).single(),
      ]);

      if (roleRes.data) setRole(roleRes.data.role as AppRole);
      if (profileRes.data) setProfile(profileRes.data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    const email = identifierToAuthEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Give a clearer hint for phone logins, whose synthetic email the user
      // never sees.
      const friendly =
        error.message === "Invalid login credentials" && !isEmailIdentifier(identifier)
          ? "Invalid phone number or password"
          : error.message;
      return { error: friendly };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const getDashboardPath = (role: AppRole | null): string => {
  switch (role) {
    case "admin":
    case "staff":
      return "/staff/dashboard";
    case "client":
      return "/client/dashboard";
    default:
      return "/login";
  }
};
