import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, PackageSearch, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { NAV_BY_ROLE } from "@/lib/nav";
import { HEADER } from "@/lib/i18n";
import { classNames } from "@/lib/utils";

export function Header() {
  const { profile, signOut } = useAuth();
  const role = profile!.role;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const [open, setOpen] = useState(false);

  const nav = NAV_BY_ROLE[role];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <PackageSearch className="h-5 w-5" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-[17px]">
            FPT{" "}
            <span className="text-brand-600">Lost&nbsp;&amp;&nbsp;Found</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                classNames(
                  "rounded-lg px-2 py-2 text-xs font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/account"
            className="hidden max-w-32 truncate text-xs text-slate-600 sm:block"
          >
            {profile!.fullName} · {role === "admin" ? "Quản trị" : "Thành viên"}
          </Link>
          <button
            className="text-xs font-medium text-brand-700"
            onClick={() => {
              void logout();
            }}
            disabled={busy}
          >
            Đăng xuất
          </button>
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={HEADER.toggleMenu}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {open && (
        <nav className="border-t border-slate-100 px-4 py-2 xl:hidden">
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
          >
            Tài khoản · {profile!.fullName}
          </Link>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                classNames(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
