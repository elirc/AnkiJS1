import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Code2,
  Inbox,
  Hammer,
  LayoutDashboard,
  Library,
  Plus,
  Settings,
  WifiOff,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SyncBadge } from "./components/SyncBadge";
import { UpdateToast } from "./components/UpdateToast";
import { hasPendingPracticeWrites } from "./db/repos/practiceRepo";

const studyNav = [
  { to: "/", label: "Today", icon: LayoutDashboard },
  { to: "/decks", label: "Decks", icon: Library },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/dotnet", label: "C# & .NET", icon: Code2 },
  { to: "/practice", label: "Engineering practice", icon: Hammer },
];
const notesNav = [
  { to: "/capture", label: "Capture", icon: Plus },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/settings", label: "Settings", icon: Settings },
];
const mobileNav = [
  studyNav[0],
  studyNav[1],
  studyNav[2],
  studyNav[3],
  notesNav[0],
];
const allNav = [...studyNav, ...notesNav];

export function App() {
  const location = useLocation();
  const studying = location.pathname.startsWith("/study");
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const protectPendingWork = (event: BeforeUnloadEvent) => {
      if (hasPendingPracticeWrites()) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protectPendingWork);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("beforeunload", protectPendingWork);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const currentLabel =
    allNav.find((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to),
    )?.label ?? "Recall";
  return (
    <div className={`app-shell ${studying ? "is-studying" : ""}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Code2 size={23} strokeWidth={2.3} />
          </span>
          <span>recall</span>
        </NavLink>
        <div className="sidebar-label">Study</div>
        <nav className="side-nav" aria-label="Main navigation">
          {studyNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `side-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={19} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-label second-label">Notes and settings</div>
        <nav className="side-nav" aria-label="Notes and settings">
          {notesNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `side-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={19} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <NavLink to="/" className="mobile-brand">
            <Code2 size={23} />
            recall
          </NavLink>
          <span className="page-name">{currentLabel}</span>
          <div className="topbar-right">
            {!online ? (
              <span className="offline-label">
                <WifiOff size={14} />
                Offline · study still works
              </span>
            ) : (
              <SyncBadge />
            )}
            <NavLink
              to="/settings"
              className="settings-button"
              aria-label="Settings"
            >
              <Settings size={18} />
            </NavLink>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
      </div>
      {!studying && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <item.icon size={21} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <UpdateToast />
    </div>
  );
}
