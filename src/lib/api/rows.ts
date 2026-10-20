import type { Row } from "../database.types";
import type { Claim, FoundReport, LostReport, Profile, Report } from "@/types";

export const mapProfile = (r: Row<"profiles">): Profile => ({
  id: r.id,
  fullName: r.full_name,
  role: r.role as Profile["role"],
  createdAt: r.created_at,
});
export function mapReport(r: Row<"reports">): Report {
  const base = {
    id: r.id,
    itemName: r.item_name,
    categoryId: r.category_id,
    description: r.description,
    date: r.date,
    time: r.time?.slice(0, 5) ?? "",
    locationId: r.location_id,
    building: r.building,
    floorRoom: r.floor_room,
    imagePath: r.image_path ?? undefined,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    moderationStatus: r.moderation_status as Report["moderationStatus"],
    moderationReason: r.moderation_reason ?? undefined,
    moderatedBy: r.moderated_by ?? undefined,
    moderatedAt: r.moderated_at ?? undefined,
  };
  return r.kind === "lost"
    ? {
        ...base,
        kind: "lost",
        distinguishingCharacteristics: r.distinguishing_characteristics,
        contactPreference: r.contact_preference,
        status: r.status as LostReport["status"],
      }
    : {
        ...base,
        kind: "found",
        currentHolder: r.current_holder as FoundReport["currentHolder"],
        status: r.status as FoundReport["status"],
      };
}
export const mapClaim = (r: Row<"claims">): Claim => ({
  id: r.id,
  foundItemId: r.found_item_id,
  lostItemId: r.lost_item_id ?? undefined,
  claimantId: r.claimant_id,
  claimantName: r.claimant_name,
  explanation: r.explanation,
  distinguishingCharacteristics: r.distinguishing_characteristics,
  proofOfOwnership: r.proof_of_ownership ?? undefined,
  contactInfo: r.contact_info,
  status: r.status as Claim["status"],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  staffNote: r.staff_note ?? undefined,
});
