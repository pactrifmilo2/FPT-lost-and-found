import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getPrivateInfo } from "@/lib/api/reports";
import { errorMessage } from "@/lib/errors";
export function PrivateInfo({ reportId }: { reportId: string }) {
  const { profile } = useAuth();
  const query = useQuery({
    queryKey: ["private-info", profile?.id, profile?.role, reportId],
    queryFn: ({ signal }) => getPrivateInfo(reportId, signal),
    enabled: profile?.role === "admin",
  });
  if (profile?.role !== "admin") return null;
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <h3 className="text-sm font-semibold text-violet-800">
        Thông tin xác minh riêng tư
      </h3>
      {query.error ? (
        <div role="alert">
          <p>{errorMessage(query.error)}</p>
          <button
            onClick={() => {
              void query.refetch();
            }}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-violet-700">
          {query.isPending ? "Đang tải…" : query.data}
        </p>
      )}
    </div>
  );
}
