import { useData } from "./data";
import type { Category } from "@/types";
const fallback: Category = {
  id: "unknown",
  name: "Không xác định",
  emoji: "📦",
  color: "#64748b",
};
export function useReference() {
  const { categories, locations } = useData();
  return {
    categories,
    locations,
    buildings: locations
      .filter((l) => l.kind === "building")
      .map((l) => l.name),
    categoryById: (id: string) =>
      categories.find((c) => c.id === id) ?? fallback,
    locationById: (id: string) => locations.find((l) => l.id === id),
  };
}
