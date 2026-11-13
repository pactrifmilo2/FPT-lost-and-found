import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { FOOTER } from '@/lib/i18n';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl space-y-2 px-4 text-center text-xs text-slate-600 sm:px-6">
          <p>{FOOTER.note}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <a className="underline" href="/privacy.html">Quyền riêng tư</a>
            <a className="underline" href="/data-deletion.html">Yêu cầu xóa dữ liệu</a>
            <a className="underline" href="/third-party-licenses.txt">Giấy phép thư viện</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
