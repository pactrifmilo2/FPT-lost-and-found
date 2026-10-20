import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { getReports } from "./api/reports";
import { getClaims } from "./api/claims";
import { getCategories, getLocations } from "./api/reference";
import { errorMessage } from "./errors";
import type { CampusLocation, Category, Claim, Report } from "@/types";
import { Button } from "@/components/ui/Button";

type Data = {
  reports: Report[];
  claims: Claim[];
  categories: Category[];
  locations: CampusLocation[];
};
const DataContext = createContext<Data | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const key = ["data", profile!.id, profile!.role];
  const reports = useQuery({
    queryKey: [...key, "reports"],
    queryFn: ({ signal }) => getReports(signal),
  });
  const claims = useQuery({
    queryKey: [...key, "claims"],
    queryFn: ({ signal }) => getClaims(signal),
  });
  const categories = useQuery({
    queryKey: [...key, "categories"],
    queryFn: ({ signal }) => getCategories(signal),
  });
  const locations = useQuery({
    queryKey: [...key, "locations"],
    queryFn: ({ signal }) => getLocations(signal),
  });
  const queries = [reports, claims, categories, locations];
  const error = queries.find((q) => q.error)?.error;
  if (error)
    return (
      <div className="card m-6 space-y-3 p-6" role="alert">
        <p>{errorMessage(error)}</p>
        <Button
          onClick={() => {
            queries.forEach((q) => {
              void q.refetch();
            });
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  if (queries.some((q) => q.isPending))
    return (
      <p className="p-8 text-center" role="status">
        Đang tải dữ liệu…
      </p>
    );
  return (
    <DataContext.Provider
      value={{
        reports: reports.data!,
        claims: claims.data!,
        categories: categories.data!,
        locations: locations.data!,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider missing");
  return value;
}
export function useAction() {
  const client = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const mutation = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
  });
  async function run(work: () => Promise<unknown>): Promise<boolean> {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await mutation.mutateAsync(work);
      await client.invalidateQueries({ queryKey: ["data", profile?.id] });
      await client.invalidateQueries({
        queryKey: ["private-info", profile?.id],
      });
      await client.invalidateQueries({ queryKey: ["profile", profile?.id] });
      return true;
    } catch (e) {
      setError(errorMessage(e));
      if ((e as { message?: string })?.message?.includes("STALE_RECORD"))
        await client.invalidateQueries({ queryKey: ["data", profile?.id] });
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { run, error, busy };
}
