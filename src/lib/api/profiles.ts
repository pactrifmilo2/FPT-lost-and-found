import { supabase } from "../supabase";
import { fetchAll } from "./pagination";
import { mapProfile } from "./rows";
import type { Role } from "@/types";
export async function getProfile(id: string, signal?: AbortSignal) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .abortSignal(signal ?? new AbortController().signal)
    .single();
  if (error) throw error;
  return mapProfile(data);
}
export async function getProfiles(signal: AbortSignal) {
  return (
    await fetchAll(
      (from, to) =>
        supabase
          .from("profiles")
          .select("*")
          .order("id")
          .range(from, to)
          .abortSignal(signal),
      signal,
    )
  ).map(mapProfile);
}
export async function updateName(name: string) {
  const { error } = await supabase.rpc("update_profile_name", { p_name: name });
  if (error) throw error;
}
export async function setRole(id: string, role: Role) {
  const { error } = await supabase.rpc("set_user_role", {
    p_id: id,
    p_role: role,
  });
  if (error) throw error;
}
