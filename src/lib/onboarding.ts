const completed = new Set<string>();
const key = (userId: string) => `fpt:onboarding:v1:${userId}`;

export function hasSeenOnboarding(userId: string) {
  if (completed.has(userId)) return true;
  try {
    return localStorage.getItem(key(userId)) === "done";
  } catch {
    return false;
  }
}

export function completeOnboarding(userId: string) {
  completed.add(userId);
  try {
    localStorage.setItem(key(userId), "done");
  } catch {
    // Keep navigation working when the browser does not allow local storage.
  }
}

export function onboardingDestination(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s]/.test(value)
  )
    return "/";
  const path = value.split(/[?#]/)[0];
  if (
    [
      "/onboarding",
      "/login",
      "/signup",
      "/auth/callback",
      "/forgot-password",
      "/reset-password",
    ].includes(path)
  )
    return "/";
  return value;
}
