import { supabase } from "../supabase";
import { fetchAll } from "./pagination";
import type { CampusLocation, Category } from "@/types";
export const getCategories = (signal: AbortSignal) =>
  fetchAll(
    (from, to) =>
      supabase
        .from("categories")
        .select("*")
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
export async function getLocations(
  signal: AbortSignal,
): Promise<CampusLocation[]> {
  const rows = await fetchAll(
    (from, to) =>
      supabase
        .from("locations")
        .select("*")
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  return rows.map((r) => ({ ...r, kind: r.kind as CampusLocation["kind"] }));
}
export async function saveCategory(category: Category, isNew: boolean) {
  const { error } = await (isNew
    ? supabase.from("categories").insert(category)
    : supabase
        .from("categories")
        .update({
          name: category.name,
          emoji: category.emoji,
          color: category.color,
        })
        .eq("id", category.id)
        .select()
        .single());
  if (error) throw error;
}
export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
}
export async function saveLocation(location: CampusLocation, isNew: boolean) {
  const { error } = await (isNew
    ? supabase.from("locations").insert(location)
    : supabase
        .from("locations")
        .update({ name: location.name, kind: location.kind })
        .eq("id", location.id)
        .select()
        .single());
  if (error) throw error;
}
export async function deleteLocation(id: string) {
  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
}
