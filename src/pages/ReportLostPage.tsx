import { ReportForm } from "@/components/ReportForm";
import { REPORT_FORM as T } from "@/lib/i18n";

export function ReportLostPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {T.lostPageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{T.lostPageSubtitle}</p>
      </header>
      <ReportForm kind="lost" />
    </div>
  );
}
