import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, Bell, Search, Settings, Sun, Moon } from "lucide-react";
import { Tooltip, Badge, Avatar } from "antd";
import Logo from "../../assets/logo.png";
import { useAuthContext } from "../../context/AuthContext";

export default function GlobalNavBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuthContext();

  const [darkMode, setDarkMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Role IDs: Admin=1, Teacher=2, Student=3, Parent=4
  const role = user?.role_id;
  const isAdmin = role === 1;
  const isTeacher = role === 2;
  const isStudent = role === 3;
  const isParent = role === 4;

  /* ---------- helpers ---------- */
  const safeString = (v) => (typeof v === "string" ? v.trim() : "");
  const getInitials = (name) => {
    const parts = safeString(name).split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getFullName = () => {
    const first = safeString(user?.firstName) || safeString(user?.first_name);
    const last = safeString(user?.lastName) || safeString(user?.last_name);
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;

    const name =
      safeString(user?.name) ||
      safeString(user?.full_name) ||
      safeString(user?.username);
    if (name) return name;

    const email = safeString(user?.email);
    if (email) return email.split("@")[0] || email;

    return "User";
  };

  /* ---------- theme ---------- */
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "light";
    setDarkMode(storedTheme === "dark");
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  /* ---------- click outside ---------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
      if (!e.target.closest(".notification-menu")) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close popovers on route change
  useEffect(() => {
    setShowSearch(false);
    setUserDropdownOpen(false);
    setNotificationOpen(false);
  }, [location]);

  /* ---------- actions ---------- */
  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  // Match Sidebar routes
  const goToDashboard = () => {
    if (!isAuthenticated) return navigate("/");
    if (isAdmin) navigate("/admin/dashboard");
    else if (isTeacher) navigate("/teacher");
    else if (isStudent) navigate("/student");
    else if (isParent) navigate("/parent");
    else navigate("/dashboard");
  };

  const goToSettings = () => {
    if (isAdmin) navigate("/admin/settings");
    else if (isTeacher) navigate("/teacher/settings");
    else if (isStudent) navigate("/student/settings");
    else if (isParent) navigate("/parent/settings");
    else navigate("/settings");
  };

  return (
    <nav className="fixed top-0 left-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-white" />
            </button>
          )}
          <div onClick={goToDashboard} className="flex items-center gap-2 cursor-pointer">
            <img src={Logo} alt="Kibundo Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg sm:text-xl font-semibold text-indigo-700 dark:text-indigo-300">
              Kibundo Platform
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 relative">
          {/* Dark Mode */}
          <button onClick={toggleTheme} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-gray-700 dark:text-white" />}
          </button>

          {isAuthenticated && (
            <>
              {/* Search */}
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Search className="w-5 h-5 text-gray-700 dark:text-white" />
                </button>
                {showSearch && (
                  <div className="absolute right-0 mt-2 w-64 z-50">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm rounded-md focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative notification-menu">
                <Tooltip title="Notifications">
                  <Badge count={notificationCount}>
                    <button
                      onClick={() => setNotificationOpen(!notificationOpen)}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Bell className="w-5 h-5 text-gray-700 dark:text-white" />
                    </button>
                  </Badge>
                </Tooltip>
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md z-50 text-sm">
                    <div className="p-3 font-semibold border-b dark:border-gray-700">Notifications</div>
                    <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <li className="p-3 text-gray-500">No new notifications</li>
                      ) : (
                        notifications.map((n) => (
                          <li key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                            {n.message}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md transition"
                >
                  <Avatar size="small" src={user?.avatarUrl} className="bg-indigo-500 text-white">
                    {!user?.avatarUrl && getInitials(getFullName())}
                  </Avatar>
                  <span className="hidden sm:block">{getFullName()}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 shadow-xl rounded-md py-2 z-50 w-56 border border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="font-semibold">{getFullName()}</div>
                      <div className="text-xs">{user?.email || "no-email@domain.com"}</div>
                    </div>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />

                    <button
                      onClick={goToSettings}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
