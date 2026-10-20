import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, MapPin } from 'lucide-react';
import type { MatchResult } from '@/types';
import { CategoryThumb } from './CategoryThumb';
import { ScoreRing } from './ScoreRing';
import { useReference } from '@/lib/useReference';
import { KIND_NOUN, formatMatchReason } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

export function MatchCard({ match, action }: { match: MatchResult; action?: ReactNode }) {
  const {categoryById,locationById}=useReference();
  const t = match.target;
  const category = categoryById(t.categoryId);
  const location = locationById(t.locationId);

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Link to={`/items/${t.id}`} className="shrink-0">
          <CategoryThumb
            category={category}
            imagePath={t.imagePath}
            alt={t.itemName}
            className="h-16 w-16 rounded-xl"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/items/${t.id}`} className="min-w-0">
              <h4 className="truncate font-semibold text-slate-900 hover:text-brand-700">{t.itemName}</h4>
            </Link>
            <ScoreRing score={match.score} size={46} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location?.name ?? t.building}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(t.date)}
            </span>
            <span className="font-medium text-slate-400">{KIND_NOUN[t.kind]}</span>
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        {match.reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            <span>{formatMatchReason(r)}</span>
          </li>
        ))}
      </ul>
      {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
