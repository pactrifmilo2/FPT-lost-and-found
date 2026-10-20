import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles } from 'lucide-react';
import type { FoundStatus, LostStatus, MatchResult, Report } from '@/types';
import { CategoryThumb } from './CategoryThumb';
import { StatusBadge } from './StatusBadge';
import { KIND_META } from '@/lib/meta';
import { CARD } from '@/lib/i18n';
import { useReference } from '@/lib/useReference';
import { classNames, formatDate } from '@/lib/utils';

export function ItemCard({
  report,
  status,
  bestMatch,
}: {
  report: Report;
  status: LostStatus | FoundStatus;
  bestMatch?: MatchResult;
}) {
  const {categoryById,locationById}=useReference();
  const category = categoryById(report.categoryId);
  const location = locationById(report.locationId);

  return (
    <Link
      to={`/items/${report.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {/* Big picture */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <CategoryThumb
          category={category}
          imagePath={report.imagePath}
          alt={report.itemName}
          className="h-full w-full"
          iconClassName="text-7xl"
        />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200">
          <span className={classNames('h-1.5 w-1.5 rounded-full', KIND_META[report.kind].dot)} />
          {KIND_META[report.kind].label}
        </span>

        <span className="absolute right-3 top-3 shadow-sm">
          <StatusBadge status={status} />
        </span>

        {bestMatch && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {CARD.matchPercent(bestMatch.score)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-slate-500">{category.name}</p>
        <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700">
          {report.itemName}
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location?.name ?? report.building}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(report.date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
