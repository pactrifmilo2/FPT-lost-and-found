import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { ReportForm } from "@/components/ReportForm";
import { getLostReportDetails } from "@/lib/api/reports";
export function EditReportPage() {
  const { id } = useParams();
  const { reports } = useData();
  const { profile } = useAuth();
  const report = reports.find((r) => r.id === id);
  const canEdit = report?.reporterId === profile?.id || profile?.role === "admin";
  const details = useQuery({
    queryKey: ["data", profile?.id, profile?.role, "lost-report-details", id],
    queryFn: ({ signal }) => getLostReportDetails(id!, signal),
    enabled: report?.kind === "lost" && canEdit,
  });
  if (!report) return <p>Không tìm thấy tin.</p>;
  if (!canEdit) return <p>Không có quyền truy cập.</p>;
  if (report.kind === "lost" && details.isPending)
    return <p role="status">Đang tải thông tin riêng…</p>;
  if (report.kind === "lost" && !details.data)
    return (
      <div role="alert">
        <p>Không tải được thông tin riêng của tin đăng.</p>
        <button className="underline" onClick={() => void details.refetch()}>
          Thử lại
        </button>
      </div>
    );
  const editableReport =
    report.kind === "lost" && details.data
      ? {
          ...report,
          contactPreference: details.data.contact_preference,
          distinguishingCharacteristics: details.data.distinguishing_characteristics,
        }
      : report;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chỉnh sửa tin</h1>
      <ReportForm key={report.id} kind={report.kind} report={editableReport} />
    </div>
  );
}
