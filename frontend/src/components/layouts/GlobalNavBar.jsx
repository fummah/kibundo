// src/components/GlobalNavBar.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, Bell, Search, Settings, Sun, Moon, ChevronRight } from "lucide-react";
import { Tooltip, Badge, Avatar } from "antd";
import Logo from "../../assets/logo.png";
import { useAuthContext } from "../../context/AuthContext";
import { ROLES } from "@/utils/roleMapper";

/** Small helpers */
const safe = (v) => (typeof v === "string" ? v.trim() : "");
const initials = (name) => {
  const parts = safe(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const fullNameFromUser = (user) => {
  const first = safe(user?.firstName) || safe(user?.first_name);
  const last = safe(user?.lastName) || safe(user?.last_name);
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const name = safe(user?.name) || safe(user?.full_name) || safe(user?.username);
  if (name) return name;
  const email = safe(user?.email);
  return email ? email.split("@")[0] : "User";
};

export default function GlobalNavBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuthContext();

  const roleId = Number(user?.role_id);
  const roleLabel =
    roleId === ROLES.ADMIN ? "Admin" :
    roleId === ROLES.TEACHER ? "Teacher" :
    roleId === ROLES.STUDENT ? "Student" :
    roleId === ROLES.PARENT ? "Parent" : "Guest";

  const [darkMode, setDarkMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  /* ---------------- Theme ---------------- */
  useEffect(() => {
    // Prefer saved theme; otherwise fall back to system preference
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setDarkMode(initial === "dark");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* --------------- Global shortcuts --------------- */
  useEffect(() => {
    const onKey = (e) => {
      const mod = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setNotificationOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------------- Click outside --------------- */
  useEffect(() => {
    const onDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
      if (!e.target.closest(".notification-menu")) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close popovers on route change
  useEffect(() => {
    setShowSearch(false);
    setUserDropdownOpen(false);
    setNotificationOpen(false);
  }, [location]);

  /* --------------- Actions --------------- */
  const handleLogout = useCallback(() => {
    logout();
    navigate("/signin");
  }, [logout, navigate]);

  const goToDashboard = useCallback(() => {
    if (!isAuthenticated) return navigate("/");
    if (roleId === ROLES.ADMIN) navigate("/admin/dashboard");
    else if (roleId === ROLES.TEACHER) navigate("/teacher");
    else if (roleId === ROLES.STUDENT) navigate("/student");
    else if (roleId === ROLES.PARENT) navigate("/parent");
    else navigate("/dashboard");
  }, [isAuthenticated, navigate, roleId]);

  const goToSettings = useCallback(() => {
    if (roleId === ROLES.ADMIN) navigate("/admin/settings");
    else if (roleId === ROLES.TEACHER) navigate("/teacher/settings");
    else if (roleId === ROLES.STUDENT) navigate("/student/settings");
    else if (roleId === ROLES.PARENT) navigate("/parent/settings");
    else navigate("/settings");
  }, [navigate, roleId]);

  /* --------------- Render --------------- */
  const name = fullNameFromUser(user);

  return (
    <nav
      className="fixed top-0 left-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
      role="navigation"
      aria-label="Global"
    >
      <div className="max-w-[100%] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-100" />
            </button>
          )}

          <button
            onClick={goToDashboard}
            className="flex items-center gap-2 group cursor-pointer"
            aria-label="Go to dashboard"
          >
            <img src={Logo} alt="Kibundo Logo" className="h-8 w-8 object-contain rounded-md" />
            <span className="hidden xs:inline text-base sm:text-lg font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">
              Kibundo Platform
            </span>
          </button>

        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Command palette / Search */}
          <div ref={searchRef} className="relative">
            <Tooltip title="Search (Ctrl/⌘ + K)">
              <button
                onClick={() => setShowSearch((v) => !v)}
                className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                aria-haspopup="dialog"
                aria-expanded={showSearch}
                aria-controls="global-search-popover"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm">Search</span>
               
              </button>
            </Tooltip>

            {/* Compact icon on small screens */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Open search"
            >
              <Search className="w-5 h-5 text-gray-700 dark:text-gray-100" />
            </button>

            {showSearch && (
              <div
                id="global-search-popover"
                role="dialog"
                aria-modal="true"
                className="absolute right-0 mt-2 w-[22rem] sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl p-2 z-50"
              >
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search pages, students, invoices…"
                    className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 px-2 pb-1">
                  Tip: try “subscriptions”, “scans”, “roles”
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <Tooltip title={darkMode ? "Light mode" : "Dark mode"}>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700 dark:text-gray-100" />}
            </button>
          </Tooltip>

          {/* Notifications */}
          {isAuthenticated && (
            <div className="relative notification-menu">
              <Tooltip title="Notifications">
                <Badge count={notificationCount} size="small" offset={[0, 4]}>
                  <button
                    onClick={() => setNotificationOpen((v) => !v)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    aria-haspopup="true"
                    aria-expanded={notificationOpen}
                    aria-controls="notif-popover"
                    aria-label="Open notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-700 dark:text-gray-100" />
                  </button>
                </Badge>
              </Tooltip>

              {notificationOpen && (
                <div
                  id="notif-popover"
                  role="menu"
                  className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-50"
                >
                  <div className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-800">
                    Notifications
                  </div>
                  <ul className="max-h-72 overflow-y-auto divide-y dark:divide-gray-800">
                    {notifications.length === 0 ? (
                      <li className="p-4 text-sm text-gray-500 dark:text-gray-400">No new notifications</li>
                    ) : (
                      notifications.map((n) => (
                        <li
                          key={n.id}
                          className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-start gap-2"
                        >
                          <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-indigo-500" />
                          <div className="flex-1">
                            <div className="text-gray-800 dark:text-gray-200">{n.message}</div>
                            {n.time && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{n.time}</div>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          {isAuthenticated && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
                aria-controls="user-menu"
              >
                <Avatar size="small" src={user?.avatar} className="bg-indigo-500 text-white">
                  {!user?.avatar && initials(fullNameFromUser(user))}
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-100">
                  {name}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  id="user-menu"
                  role="menu"
                  className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email || "no-email@domain.com"}</div>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                      {roleLabel}
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-800" />
                  <button
                    onClick={goToSettings}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
