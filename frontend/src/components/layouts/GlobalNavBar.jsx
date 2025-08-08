import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  LogOut,
  Menu,
  Bell,
  Search,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { Tooltip, Badge, Button, Avatar, message } from "antd";
import Logo from "../../assets/logo.png";
import api from "../../api/axios";
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

  const role = user?.role_id;
  const isAdmin = role === 0;
  const isTeacher = role === 2;
  const isStudent = role === 3;
  const isParent = role === 4;

  const getFullName = () => {
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    }
    return user?.name || "User";
  };

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserDropdownOpen(false);
      if (!e.target.closest(".notification-menu")) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowSearch(false);
    setUserDropdownOpen(false);
    setNotificationOpen(false);
  }, [location]);

 // useEffect(() => {
//   if (!isAuthenticated) return;
//   const fetchNotifications = async () => {
//     try {
//       const res = await api.get("/notifications");
//       setNotifications(res.data || []);
//       setNotificationCount(res.data?.length || 0);
//     } catch (error) {
//       console.error("Error fetching notifications", error);
//     }
//   };
//   fetchNotifications();
//   const interval = setInterval(fetchNotifications, 10000);
//   return () => clearInterval(interval);
// }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  const goToDashboard = () => {
    if (!isAuthenticated) return navigate("/");
    if (isAdmin) navigate("/admin/dashboard");
    else if (isTeacher) navigate("/teacher/dashboard");
    else if (isStudent) navigate("/student/dashboard");
    else if (isParent) navigate("/parent/dashboard");
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
  <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    {/* Left Section (Logo + Toggle) */}
    <div className="flex items-center gap-3 min-w-0 overflow-hidden flex-shrink-0">
      {isAuthenticated && (
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-white" />
        </button>
      )}

      <div
        onClick={goToDashboard}
        className="flex items-center gap-2 cursor-pointer truncate"
      >
        <img
          src={Logo}
          alt="Kibundo Logo"
          className="h-8 w-8 object-contain flex-shrink-0"
        />
        <span className="text-base sm:text-lg font-semibold text-indigo-700 dark:text-indigo-300 hidden xs:inline truncate">
          Kibundo Platform
        </span>
      </div>
    </div>

    {/* Right Section (Actions) */}
    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {darkMode ? (
          <Sun className="text-yellow-400 w-5 h-5" />
        ) : (
          <Moon className="text-gray-700 dark:text-white w-5 h-5" />
        )}
      </button>

      {isAuthenticated && (
        <>
         <div ref={searchRef} className="relative w-8 sm:w-10 md:w-auto">
  <button
    onClick={() => setShowSearch(!showSearch)}
    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    <Search className="w-5 h-5 text-gray-700 dark:text-white" />
  </button>

  {showSearch && (
    <div className="absolute right-0 mt-2 w-[240px] sm:w-64 z-50">
      <input
        type="text"
        autoFocus
        placeholder="Search..."
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <div className="p-3 font-semibold border-b dark:border-gray-700">
                  Notifications
                </div>
                <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="p-3 text-gray-500">
                      No new notifications
                    </li>
                  ) : (
                    notifications.map((n) => (
                      <li
                        key={n.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {n.message}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md transition"
            >
              <Avatar
                size="small"
                src={user?.avatarUrl}
                className="bg-indigo-500 text-white"
              >
                {!user?.avatarUrl && getFullName()[0]}
              </Avatar>
              <span className="hidden sm:block truncate max-w-[120px]">
                {getFullName()}
              </span>
            </button>

            {userDropdownOpen && (
              <div
                ref={userMenuRef}
                className="absolute right-0 mt-2 bg-white dark:bg-gray-800 shadow-xl rounded-md py-2 z-50 w-56 border border-gray-200 dark:border-gray-700"
              >
                <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-semibold">{getFullName()}</div>
                  <div className="text-xs">
                    {user?.email || "no-email@domain.com"}
                  </div>
                </div>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />

                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin/reports")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Admin Reports
                  </button>
                )}
                {isTeacher && (
                  <button
                    onClick={() => navigate("/teacher/assignments")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    My Assignments
                  </button>
                )}
                {isStudent && (
                  <button
                    onClick={() => navigate("/student/courses")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    My Courses
                  </button>
                )}
                {isParent && (
                  <button
                    onClick={() => navigate("/parent/children")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    My Children
                  </button>
                )}

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
