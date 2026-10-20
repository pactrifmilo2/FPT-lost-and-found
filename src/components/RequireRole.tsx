import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import type { Role } from "@/types";
import { Button } from "./ui/Button";
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    try {
      await auth.signOut();
    } catch (error) {
      setLogoutError(errorMessage(error));
    }
  }
  if (auth.loading)
    return (
      <p className="p-8 text-center" role="status">
        Đang kiểm tra phiên đăng nhập…
      </p>
    );
  if (auth.error)
    return (
      <div className="card m-6 space-y-3 p-6" role="alert">
        <p>{errorMessage(auth.error)}</p>
        <Button onClick={auth.retry}>Thử lại</Button>
        <Button
          variant="outline"
          onClick={() => {
            void logout();
          }}
        >
          Đăng xuất
        </Button>
        {logoutError && <p>{logoutError}</p>}
      </div>
    );
  if (!auth.session)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (auth.recovery) return <Navigate to="/reset-password" replace />;
  if (!auth.profile)
    return (
      <p className="p-8" role="alert">
        Không tìm thấy hồ sơ tài khoản. Vui lòng đăng nhập lại.
      </p>
    );
  return <>{children}</>;
}
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role))
    return (
      <div className="card p-6" role="alert">
        Không có quyền truy cập.
      </div>
    );
  return <>{children}</>;
}
