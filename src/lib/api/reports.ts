import { supabase } from "../supabase";
import { fetchAll } from "./pagination";
import { mapReport } from "./rows";
import type { Json } from "../database.types";
import type { Report } from "@/types";
export async function getReports(signal: AbortSignal) {
  return (
    await fetchAll(
      (from, to) =>
        supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to)
          .abortSignal(signal),
      signal,
    )
  ).map(mapReport);
}
export async function createReport(
  id: string,
  data: Record<string, Json>,
  privateInfo?: string,
) {
  const { error } = await supabase.rpc("create_report", {
    p_id: id,
    p_data: data,
    ...(privateInfo ? { p_private_info: privateInfo } : {}),
  });
  if (error) throw error;
}
export async function editReport(
  report: Report,
  data: Record<string, Json>,
  privateInfo?: string,
) {
  const { error } = await supabase.rpc("edit_report", {
    p_id: report.id,
    p_data: data,
    p_expected_updated_at: report.updatedAt,
    ...(privateInfo ? { p_private_info: privateInfo } : {}),
  });
  if (error) throw error;
}
export async function moderateReport(
  report: Report,
  action: "hide" | "restore" | "close" | "reopen",
  reason = "",
) {
  const { error } = await supabase.rpc("moderate_report", {
    p_id: report.id,
    p_action: action,
    p_reason: reason,
    p_expected_updated_at: report.updatedAt,
  });
  if (error) throw error;
}
export async function deleteReport(id: string) {
  const { data, error } = await supabase.rpc("delete_report", { p_id: id });
  if (error) throw error;
  return data;
}
export async function getPrivateInfo(id: string, signal: AbortSignal) {
  const { data, error } = await supabase
    .from("report_private")
    .select("private_verification_info")
    .eq("report_id", id)
    .abortSignal(signal)
    .single();
  if (error) throw error;
  return data.private_verification_info;
}
