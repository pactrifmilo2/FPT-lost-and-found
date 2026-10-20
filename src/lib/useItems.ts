import { useMemo } from 'react';
import { useData } from './data';
import { effectiveStatus, findMatches } from '@/lib/matching';
import type { MatchResult, Report } from '@/types';

export interface EnrichedItem {
  report: Report;
  status: Report['status'];
  bestMatch?: MatchResult;
  matches: MatchResult[];
}

/** All reports, each annotated with its effective status and possible matches. */
export function useEnrichedItems(): EnrichedItem[] {
  const { reports } = useData();
  return useMemo(
    () =>
      reports.map((report) => {
        const matches = findMatches(report, reports);
        return {
          report,
          status: effectiveStatus(report, reports),
          bestMatch: matches[0],
          matches,
        };
      }),
    [reports],
  );
}
