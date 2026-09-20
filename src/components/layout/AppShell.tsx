import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OfflineBanner } from './OfflineBanner';

/** Full-screen routes (exam runner, interview session) hide navigation so the timer/camera has the whole viewport. */
const FULLSCREEN = [/^\/supertet\/test\/[^/]+$/, /^\/kvs\/interview\/[^/]+$/];

export function AppShell() {
  const { pathname } = useLocation();
  const fullscreen = FULLSCREEN.some((r) => r.test(pathname));
  if (fullscreen) return <main className="min-h-dvh bg-surface-muted"><OfflineBanner /><Outlet /></main>;
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <OfflineBanner />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-[calc(84px+var(--safe-bottom))] lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
