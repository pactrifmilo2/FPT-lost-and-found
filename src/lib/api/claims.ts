import { supabase } from "../supabase";
import { fetchAll } from "./pagination";
import { mapClaim } from "./rows";
import type { Json } from "../database.types";
import type { Claim, ClaimAction } from "@/types";
export async function getClaims(signal: AbortSignal) {
  return (
    await fetchAll(
      (from, to) =>
        supabase
          .from("claims")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to)
          .abortSignal(signal),
      signal,
    )
  ).map(mapClaim);
}
export async function submitClaim(data: Record<string, Json>) {
  const { error } = await supabase.rpc("submit_claim", { p_data: data });
  if (error) throw error;
}
export async function transitionClaim(
  claim: Claim,
  action: ClaimAction,
  note?: string,
) {
  const { error } = await supabase.rpc("transition_claim", {
    p_id: claim.id,
    p_action: action,
    p_expected_updated_at: claim.updatedAt,
    ...(note !== undefined ? { p_note: note } : {}),
  });
  if (error) throw error;
}
