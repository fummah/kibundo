import { useState, useEffect } from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  UserCheck,
  GraduationCap,
  FileText,
  Database,
  BookOpen,
  BarChart2,
  ClipboardList,
  Users,
  ShieldCheck,
  Settings,
  Search,
} from "lucide-react";
import {
  BarChartOutlined,
  LineChartOutlined,
  RiseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext";

export default function Sidebar({ menuOpen = true, setMenuOpen = () => {} }) {
  const location = useLocation();
  const { user } = useAuthContext();
  const { schoolSlug } = useParams();
  const slug = schoolSlug || "default-school";

  const [searchTerm, setSearchTerm] = useState("");
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const roleId = user?.role_id;

  const menuItemsByRole = {
    // 👑 Admin
    1: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        label: "User Management",
        icon: Users,
        children: [
          { href: "/admin/student-enrolment", label: "Student Enrolment", icon: GraduationCap },
          { href: "/admin/teacher-enrolment", label: "Teacher Enrolment", icon: UserCheck },
          { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck },
        ],
      },
      {
        label: "Reports",
        icon: BarChart2,
        children: [
          { href: "/admin/reports", label: "Reports", icon: BarChart2 },
          { href: "/admin/generate-reports", label: "Generate Reports", icon: BarChart2 },
        ],
      },
      {
        label: "Analysis",
        icon: BarChart2,
        children: [
          { href: "/admin/analytics-dashboard", label: "Analytics Dashboard", icon: BarChartOutlined },
          { href: "/admin/statistics", label: "Statistics", icon: LineChartOutlined },
          { href: "/admin/analytics", label: "Analytics", icon: RiseOutlined },
        ],
      },
      {
        label: "School Management",
        icon: TeamOutlined,
        children: [
          { href: "/admin/schools", label: "Select or Add School", icon: Search },
          { href: `/admin/schools/${slug}/dashboard`, label: "Overview", icon: LayoutDashboard },
          { href: `/admin/schools/${slug}/teachers`, label: "Teachers", icon: UserCheck },
          { href: `/admin/schools/${slug}/students`, label: "Students", icon: GraduationCap },
          { href: `/admin/schools/${slug}/reports`, label: "Reports", icon: BarChart2 },
          { href: `/admin/schools/${slug}/settings`, label: "Settings", icon: Settings },
        ],
      },
      {
        label: "Academics",
        icon: BookOpen,
        children: [
          { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
          { href: "/admin/assignments", label: "Assignments", icon: ClipboardList },
        ],
      },
      { href: "/admin/contracts", label: "Contracts", icon: FileText },
      { href: "/admin/database", label: "Database", icon: Database },
      { href: "/admin/philosophy", label: "Philosophy", icon: BookOpen },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],

    // 👨‍🏫 Teacher
    2: [
      { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/teacher/students", label: "My Students", icon: GraduationCap },
      { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/teacher/subjects", label: "Subjects", icon: BookOpen },
      { href: "/teacher/reports", label: "Reports", icon: BarChart2 },
      { href: "/teacher/settings", label: "Settings", icon: Settings },
    ],

    // 👩‍🎓 Student
    3: [
      { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/student/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/student/subjects", label: "Subjects", icon: BookOpen },
      { href: "/student/grades", label: "Grades", icon: BarChart2 },
      { href: "/student/settings", label: "Settings", icon: Settings },
    ],

    // 👨‍👩‍👧‍👦 Parent
    4: [
      { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/parent/children", label: "Children", icon: Users },
      { href: "/parent/progress", label: "Progress Reports", icon: BarChart2 },
      { href: "/parent/settings", label: "Settings", icon: Settings },
    ],
  };

  const menuItems = menuItemsByRole[roleId] || [];

  useEffect(() => {
    const currentPath = location.pathname;
    menuItems.forEach((item, index) => {
      if (item.children?.some((child) => currentPath.startsWith(child.href))) {
        setOpenSubmenu(index);
      }
    });
  }, [location.pathname]);

  const filterMenuItems = (items) => {
    const term = searchTerm.trim().toLowerCase();
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) =>
            child.label.toLowerCase().includes(term)
          );
          return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
        } else {
          return item.label.toLowerCase().includes(term) ? item : null;
        }
      })
      .filter(Boolean);
  };

  const filteredItems = filterMenuItems(menuItems);
  const currentPath = location.pathname;

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r dark:border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-1">
            {filteredItems.map((item, index) => {
              const hasChildren = Array.isArray(item.children);
              const isSubmenuOpen = openSubmenu === index;

              return (
                <div key={index}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => setOpenSubmenu(isSubmenuOpen ? null : index)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm text-left ${
                          isSubmenuOpen
                            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </span>
                        <svg
                          className={`w-4 h-4 transform transition-transform ${
                            isSubmenuOpen ? "rotate-90" : ""
                          }`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M6 6l6 4-6 4V6z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {isSubmenuOpen && (
                        <div className="ml-5 mt-1 space-y-1">
                          {item.children.map((child, subIdx) => {
                            const isChildActive = currentPath === child.href;
                            return (
                              <Link
                                key={subIdx}
                                to={child.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition ${
                                  isChildActive
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-white font-semibold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <child.icon className="w-4 h-4" />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                        currentPath === item.href
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-white font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
