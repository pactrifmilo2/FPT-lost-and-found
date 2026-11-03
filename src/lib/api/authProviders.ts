export interface OAuthProviders {
  google: boolean;
  facebook: boolean;
}

// Auth exposes enabled providers publicly so the login screen can reflect
// dashboard configuration without shipping provider secrets to the browser.
export async function getOAuthProviders(
  signal?: AbortSignal,
): Promise<OAuthProviders> {
  const url = new URL("/auth/v1/settings", import.meta.env.VITE_SUPABASE_URL);
  const response = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    signal,
  });
  if (!response.ok) throw new Error("Could not load Auth providers");
  const settings = (await response.json()) as {
    external?: Record<string, boolean>;
  };
  return {
    google: settings.external?.google === true,
    facebook: settings.external?.facebook === true,
  };
}
