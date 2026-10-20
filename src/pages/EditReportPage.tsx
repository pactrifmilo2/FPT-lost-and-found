import { useParams } from "react-router-dom";
import { useData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { ReportForm } from "@/components/ReportForm";
export function EditReportPage() {
  const { id } = useParams();
  const { reports } = useData();
  const { profile } = useAuth();
  const report = reports.find((r) => r.id === id);
  if (!report) return <p>Không tìm thấy tin.</p>;
  if (report.reporterId !== profile?.id && profile?.role !== "admin")
    return <p>Không có quyền truy cập.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chỉnh sửa tin</h1>
      <ReportForm key={report.id} kind={report.kind} report={report} />
    </div>
  );
}
