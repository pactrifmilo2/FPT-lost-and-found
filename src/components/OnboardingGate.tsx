import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { hasSeenOnboarding } from "@/lib/onboarding";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  if (profile && !hasSeenOnboarding(profile.id)) {
    const next = location.pathname + location.search + location.hash;
    return (
      <Navigate to={`/onboarding?next=${encodeURIComponent(next)}`} replace />
    );
  }
  return <>{children}</>;
}
