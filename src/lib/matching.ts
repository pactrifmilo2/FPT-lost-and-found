import type { FoundReport, LostReport, MatchReason, MatchResult, Report } from '@/types';
import { clamp } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Rule-based matching. No external AI — just deterministic similarity rules
// over category, item name, date, location and description keywords.
// ---------------------------------------------------------------------------

/** Score below which two reports are not shown as a "possible match". */
export const MATCH_THRESHOLD = 50;

// Dimension weights (points).
const W_CATEGORY = 25;
const W_NAME = 35;
const W_DATE = 12;
const W_LOCATION = 15;
const W_DESCRIPTION = 10;

// Vietnamese function words carry no identifying value, so they are dropped
// before token overlap is measured. Descriptive words (incl. colours and
// materials, which often retain their diacritics) are deliberately kept.
const STOPWORDS: Record<string, true> = {
  va: true, cua: true, cho: true, voi: true, hoac: true, thi: true, la: true,
  mot: true, nhung: true, cac: true, nay: true, do: true, kia: true, ay: true,
  toi: true, minh: true, ban: true, chung: true, no: true, ho: true,
  co: true, bi: true, duoc: true, da: true, dang: true, se: true, khong: true,
  trong: true, ngoai: true, tren: true, duoi: true, ve: true, tu: true,
  den: true, bang: true, theo: true, de: true, vi: true, nen: true, ma: true,
  gan: true, quanh: true, khoang: true, luc: true, khi: true,
  mat: true, tim: true, thay: true, nhat: true, bao: true,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(' ').filter((t) => t && !STOPWORDS[t]);
}

function bigrams(s: string): Set<string> {
  const clean = normalize(s).replace(/[^a-z0-9]/g, '');
  const out = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2));
  return out;
}

/**
 * Dice coefficient over character bigrams — robust for short names like
 * "AirPods Pro" vs "AirPods Pro 2nd Gen".
 */
export function diceCoefficient(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/** Jaccard token overlap — good for comparing description keywords. */
function tokenOverlap(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a.length === 10 ? `${a}T00:00:00` : a);
  const db = new Date(b.length === 10 ? `${b}T00:00:00` : b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 999;
  return Math.abs(Math.round((db.getTime() - da.getTime()) / 86_400_000));
}

/** Score one lost report against one found report, with translatable reason keys. */
export function scoreMatch(lost: LostReport, found: FoundReport): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let score = 0;

  // 1. Same category
  if (lost.categoryId === found.categoryId) {
    score += W_CATEGORY;
    reasons.push({ key: 'sameCategory', points: W_CATEGORY, max: W_CATEGORY });
  }

  // 2. Similar item name
  const nameSim = diceCoefficient(lost.itemName, found.itemName);
  if (nameSim > 0.35) {
    const pts = Math.round(nameSim * W_NAME);
    score += pts;
    reasons.push({
      key: nameSim >= 0.8 ? 'nearlyIdenticalName' : 'similarName',
      points: pts,
      max: W_NAME,
    });
  }

  // 3. Date proximity
  const dayDiff = daysBetween(lost.date, found.date);
  if (dayDiff <= 14) {
    const pts = dayDiff === 0 ? W_DATE : Math.max(4, Math.round(W_DATE * (1 - dayDiff / 14)));
    score += pts;
    reasons.push(
      dayDiff === 0
        ? { key: 'sameDay', points: pts, max: W_DATE }
        : dayDiff === 1
          ? { key: 'oneDayAfter', points: pts, max: W_DATE }
          : { key: 'daysAfter', params: { days: dayDiff }, points: pts, max: W_DATE },
    );
  }

  // 4. Same / nearby location
  if (lost.locationId === found.locationId) {
    score += W_LOCATION;
    reasons.push({ key: 'sameLocation', points: W_LOCATION, max: W_LOCATION });
  } else if (lost.building && found.building && lost.building === found.building) {
    const pts = 8;
    score += pts;
    reasons.push({ key: 'sameBuilding', points: pts, max: W_LOCATION });
  }

  // 5. Description keyword similarity
  const descSim = tokenOverlap(lost.description, found.description);
  if (descSim > 0.15) {
    const pts = Math.round(descSim * W_DESCRIPTION);
    score += pts;
    reasons.push({ key: 'similarDescription', points: pts, max: W_DESCRIPTION });
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

/** Find every possible match for a report, sorted by score (best first). */
export function findMatches(report: Report, all: Report[]): MatchResult[] {
  const results: MatchResult[] = [];
  if (report.moderationStatus !== 'VISIBLE' || report.status === 'RETURNED' || report.status === 'CLOSED') return results;

  if (report.kind === 'lost') {
    for (const r of all) {
      if (r.moderationStatus !== 'VISIBLE') continue;
      if (r.kind !== 'found') continue;
      if (r.status === 'RETURNED' || r.status === 'CLOSED') continue;
      const { score, reasons } = scoreMatch(report, r);
      if (score >= MATCH_THRESHOLD) results.push({ target: r, score, reasons });
    }
  } else {
    for (const r of all) {
      if (r.moderationStatus !== 'VISIBLE') continue;
      if (r.kind !== 'lost') continue;
      if (r.status === 'RETURNED' || r.status === 'CLOSED') continue;
      const { score, reasons } = scoreMatch(r, report);
      if (score >= MATCH_THRESHOLD) results.push({ target: r, score, reasons });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * The status shown to users: an open report with a strong match reads as
 * POSSIBLE_MATCH even though its stored status is still LOST / AVAILABLE.
 */
export function effectiveStatus(report: Report, all: Report[]): Report['status'] {
  if (report.status === 'RETURNED' || report.status === 'CLOSED' || report.status === 'CLAIM_IN_PROGRESS') {
    return report.status;
  }
  return findMatches(report, all).length > 0 ? 'POSSIBLE_MATCH' : report.status;
}
