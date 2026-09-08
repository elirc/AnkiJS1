import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Code2,
  Inbox,
  Hammer,
  LayoutDashboard,
  Library,
  Plus,
  Settings,
  Sprout,
  WifiOff,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SyncBadge } from "./components/SyncBadge";
import { UpdateToast } from "./components/UpdateToast";
import { hasPendingPracticeWrites } from "./db/repos/practiceRepo";

const primaryNav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/decks", label: "My decks", icon: Library },
  { to: "/study", label: "Quick study", icon: BookOpen },
  { to: "/progress", label: "My progress", icon: BarChart3 },
  { to: "/dotnet", label: "C# & .NET", icon: Code2 },
  { to: "/practice", label: "Engineering practice", icon: Hammer },
];
const mobileNav = [
  primaryNav[0],
  primaryNav[1],
  primaryNav[2],
  primaryNav[3],
  { to: "/capture", label: "Capture", icon: Plus },
];
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
    [
      ...primaryNav,
      { to: "/capture", label: "Quick capture" },
      { to: "/inbox", label: "Inbox" },
      { to: "/settings", label: "Settings" },
    ].find((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to),
    )?.label ?? "Your workspace";
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
          <span>
            recall<span className="brand-period">.</span>
            <small>FOR THE CURIOUS ENGINEER</small>
          </span>
        </NavLink>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {primaryNav.map((item) => (
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
        <div className="sidebar-label second-label">MAKE IT YOURS</div>
        <nav className="side-nav" aria-label="Your tools">
          {[
            { to: "/capture", label: "Quick capture", icon: Plus },
            { to: "/inbox", label: "Inbox", icon: Inbox },
            { to: "/settings", label: "Settings", icon: Settings },
          ].map((item) => (
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
        <div className="sidebar-bottom">
          <div className="growth-note">
            <Sprout size={25} strokeWidth={1.5} />
            <p>
              Small steps.
              <br />
              Stronger engineer.
            </p>
            <span>A few minutes today go a long way.</span>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" /> BUILT FOR YOUR NEXT LEVEL
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <NavLink to="/" className="mobile-brand">
            <Code2 size={23} />
            recall.
          </NavLink>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{currentLabel}</strong>
          </div>
          <div className="topbar-right">
            {!online ? (
              <span className="offline-label">
                <WifiOff size={14} />
                Offline · study ready
              </span>
            ) : (
              <SyncBadge />
            )}
            <NavLink
              to="/settings"
              className="profile-button"
              aria-label="Settings"
            >
              <span>Y</span>
              <Settings size={16} />
            </NavLink>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>Made for the moments in between.</span>
          <span>Learn. Recall. Repeat.</span>
        </footer>
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
              <span>
                {item.label === "Quick study"
                  ? "Study"
                  : item.label === "My progress"
                    ? "Progress"
                    : item.label === "Overview"
                      ? "Today"
                      : item.label === "My decks"
                        ? "Decks"
                        : item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      )}
      <UpdateToast />
    </div>
  );
}
