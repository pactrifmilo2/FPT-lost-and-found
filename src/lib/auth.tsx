import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getProfile } from "./api/profiles";
import type { Profile } from "@/types";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: unknown;
  recovery: boolean;
  retry: () => void;
  signOut: () => Promise<void>;
  finishRecovery: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<unknown>(null);
  const [recovery, setRecovery] = useState(
    window.location.pathname === "/reset-password",
  );
  const identity = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      const id = next?.user.id ?? null;
      if (identity.current !== id) {
        void client.cancelQueries();
        client.clear();
        identity.current = id;
      }
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!next) setRecovery(false);
      setSession(next);
      setAuthError(null);
      setInitialized(true);
    });
    // Capture initialization errors; session state itself comes from the subscription.
    void supabase.auth
      .getSession()
      .then(({ error }) => {
        if (mounted && error) {
          setAuthError(error);
          setInitialized(true);
        }
      })
      .catch((error) => {
        if (mounted) {
          setAuthError(error);
          setInitialized(true);
        }
      });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);
  const profileQuery = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: ({ signal }) => getProfile(session!.user.id, signal),
    enabled: !!session,
    staleTime: 0,
    refetchInterval: 60_000,
    retry: 1,
  });
  const profile = session ? (profileQuery.data ?? null) : null;
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading: !initialized || (!!session && profileQuery.isPending),
        error: authError ?? (session ? profileQuery.error : null),
        recovery,
        signOut,
        retry: () => {
          if (authError || !session) window.location.reload();
          else void profileQuery.refetch();
        },
        finishRecovery: () => setRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
