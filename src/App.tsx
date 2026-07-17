import { BookOpen, Home, Inbox, Library, PlusCircle, Settings, Zap } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { SyncBadge } from './components/SyncBadge';
import { UpdateToast } from './components/UpdateToast';
import { cn } from './lib/cn';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/study', label: 'Study', icon: BookOpen },
  { to: '/capture', label: 'Capture', icon: PlusCircle, center: true },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/decks', label: 'Decks', icon: Library },
];

export function App() {
  return (
    <div className="min-h-dvh text-text">
      <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-pressed text-white shadow-sm shadow-primary/30">
              <Zap className="size-4" aria-hidden="true" />
            </span>
            Recall
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted outline-none transition hover:bg-primary/10 hover:text-text focus-visible:ring-2 focus-visible:ring-primary',
                    isActive && 'bg-primary/10 font-semibold text-primary',
                  )
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SyncBadge />
            <NavLink
              to="/settings"
              className="inline-flex size-11 items-center justify-center rounded-full text-muted outline-none transition hover:bg-primary/10 hover:text-text focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  isActive && !item.center && 'text-primary',
                  item.center && 'font-semibold',
                )
              }
            >
              {item.center ? (
                <span className="-mt-7 flex size-13 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-pressed text-white shadow-lg shadow-primary/40 ring-4 ring-background">
                  <item.icon className="size-6" aria-hidden="true" />
                </span>
              ) : (
                <item.icon className="size-5" aria-hidden="true" />
              )}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <UpdateToast />
    </div>
  );
}
