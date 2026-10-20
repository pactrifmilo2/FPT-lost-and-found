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
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400 sm:px-6">
          {FOOTER.note}
        </div>
      </footer>
    </div>
  );
}
