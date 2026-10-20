// Shared domain types. Authorization and persisted workflow states live in Postgres.

export type Role = 'member' | 'admin';

export type ReportKind = 'lost' | 'found';
export type ModerationStatus = 'VISIBLE' | 'HIDDEN';
export interface Profile { id: string; fullName: string; role: Role; createdAt: string }
export type ClaimAction = 'review' | 'approve' | 'reject' | 'complete' | 'reopen';

export type LostStatus =
  | 'LOST'
  | 'POSSIBLE_MATCH'
  | 'CLAIM_IN_PROGRESS'
  | 'RETURNED'
  | 'CLOSED';

export type FoundStatus =
  | 'AVAILABLE'
  | 'POSSIBLE_MATCH'
  | 'CLAIM_IN_PROGRESS'
  | 'RETURNED'
  | 'CLOSED';

export type ClaimStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type CurrentHolder = 'finder' | 'security-desk' | 'student-services';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  kind: 'building' | 'area';
}

export interface BaseReport {
  id: string;
  itemName: string;
  categoryId: string;
  /** Public description shown to everyone. */
  description: string;
  /** Date the item was lost / found (YYYY-MM-DD). */
  date: string;
  /** Approximate time (HH:MM). */
  time: string;
  locationId: string;
  building: string;
  imagePath?: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  moderationStatus: ModerationStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface LostReport extends BaseReport {
  kind: 'lost';
  floorRoom: string;
  distinguishingCharacteristics: string;
  contactPreference: string;
  status: LostStatus;
}

export interface FoundReport extends BaseReport {
  kind: 'found';
  currentHolder: CurrentHolder;
  status: FoundStatus;
}

export type Report = LostReport | FoundReport;

export interface Claim {
  id: string;
  foundItemId: string;
  /** Optional link to the claimant's own lost report. */
  lostItemId?: string;
  claimantId: string;
  claimantName: string;
  explanation: string;
  distinguishingCharacteristics: string;
  proofOfOwnership?: string;
  contactInfo: string;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  staffNote?: string;
}

/** Which scoring rule fired; the label is translated at render time. */
export type MatchReasonKey =
  | 'sameCategory'
  | 'nearlyIdenticalName'
  | 'similarName'
  | 'sameDay'
  | 'oneDayAfter'
  | 'daysAfter'
  | 'sameLocation'
  | 'sameBuilding'
  | 'similarDescription';

export interface MatchReason {
  key: MatchReasonKey;
  /** Only `daysAfter` carries a parameter. */
  params?: { days: number };
  points: number;
  max: number;
}

export interface MatchResult {
  /** The counterpart report that matched. */
  target: Report;
  score: number;
  reasons: MatchReason[];
}
