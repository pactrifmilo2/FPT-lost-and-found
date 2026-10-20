import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/data";
import { configurationError } from "@/lib/supabase";
import { Layout } from "@/components/Layout";
import { RequireAuth, RequireRole } from "@/components/RequireRole";
import { HomePage } from "@/pages/HomePage";
import { LostFoundPage } from "@/pages/LostFoundPage";
import { ItemDetailPage } from "@/pages/ItemDetailPage";
import { ReportLostPage } from "@/pages/ReportLostPage";
import { ReportFoundPage } from "@/pages/ReportFoundPage";
import { MyReportsPage } from "@/pages/MyReportsPage";
import { ClaimsPage } from "@/pages/ClaimsPage";
import { AdminPage } from "@/pages/AdminPage";
import { AuthPage } from "@/pages/AuthPage";
import { EditReportPage } from "@/pages/EditReportPage";
import { AccountPage } from "@/pages/AccountPage";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export default function App() {
  if (configurationError)
    return (
      <div className="card mx-auto mt-20 max-w-lg p-6" role="alert">
        <h1 className="mb-3 text-xl font-bold">Cần cấu hình ứng dụng</h1>
        <p>{configurationError}</p>
      </div>
    );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password" element={<AuthPage mode="reset" />} />
          <Route path="/auth/callback" element={<AuthPage mode="callback" />} />
          <Route
            element={
              <RequireAuth>
                <DataProvider>
                  <Layout />
                </DataProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/items" element={<LostFoundPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/report-lost" element={<ReportLostPage />} />
            <Route path="/report-found" element={<ReportFoundPage />} />
            <Route path="/items/:id/edit" element={<EditReportPage />} />
            <Route path="/my-reports" element={<MyReportsPage />} />
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/admin"
              element={
                <RequireRole roles={["admin"]}>
                  <AdminPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
