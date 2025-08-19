import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  DashboardOutlined,
  TeamOutlined,
  ReadOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ProjectOutlined,
  RobotOutlined,
  BookOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ReconciliationOutlined,
  TagsOutlined,
  FileProtectOutlined,
  ContainerOutlined,
  ProfileOutlined,
  SnippetsOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  DatabaseOutlined,
  FileDoneOutlined,   // ✅ Invoices
  MailOutlined,       // ✅ Newsletter
} from "@ant-design/icons";
import { useAuthContext } from "@/context/AuthContext";

/**
 * Props:
 * - menuOpen?: boolean
 * - setMenuOpen?: (open:boolean)=>void
 */
export default function Sidebar({ menuOpen = true, setMenuOpen = () => {} }) {
  const location = useLocation();
  const { user } = useAuthContext();
  const roleId = user?.role_id;

  const [searchTerm, setSearchTerm] = useState("");
  const [openSubmenu, setOpenSubmenu] = useState(null);

  /** Menus aligned to AdminRoutes.jsx (with Philosophy, Database, Newsletter, Invoices) */
  const adminMenu = [
    // --- Dashboards (flattened to standalone links below) ---
    {
      label: "Dashboards",
      icon: DashboardOutlined,
      children: [
        { href: "/admin/dashboard", label: "Admin Dashboard", icon: DashboardOutlined },
        { href: "/admin/analytics", label: "Analytics", icon: BarChartOutlined },
        { href: "/admin/statistics", label: "Statistics", icon: LineChartOutlined },
      ],
    },

    {
      label: "User Management",
      icon: TeamOutlined,
      children: [
        { href: "/admin/parents", label: "Parents", icon: TeamOutlined },
        { href: "/admin/students", label: "Students", icon: TeamOutlined },
        { href: "/admin/teachers", label: "Teachers", icon: TeamOutlined },
      ],
    },

    {
      label: "Academics",
      icon: ReadOutlined,
      children: [
        { href: "/admin/academics", label: "Overview", icon: ReadOutlined },
        { href: "/admin/academics/curricula", label: "Curricula", icon: ReadOutlined },
        { href: "/admin/academics/worksheet", label: "Worksheet", icon: FileTextOutlined },
        { href: "/admin/academics/quiz", label: "Quiz", icon: ExperimentOutlined },
        { href: "/admin/academics/game", label: "Game", icon: ProjectOutlined },
        { href: "/admin/academics/ai-agent", label: "AI Agent", icon: RobotOutlined },
        { href: "/admin/academics/subjects", label: "Subjects", icon: BookOutlined },
        //{ href: "/admin/academics/subjects/new", label: "New Subject", icon: BookOutlined },

        // ✅ Scans nested under Academics (OCR link removed; opened inline in page)
        { href: "/admin/academics/scans", label: "Scans", icon: FileSearchOutlined },
      ],
    },

    {
      label: "Reports",
      icon: BarChartOutlined,
      children: [
        { href: "/admin/reports", label: "Overview", icon: BarChartOutlined },
        { href: "/admin/reports/generate", label: "Generate", icon: FileTextOutlined },
      ],
    },

    {
      label: "Billing",
      icon: ReconciliationOutlined,
      children: [
        { href: "/admin/billing", label: "Overview", icon: ReconciliationOutlined },
        { href: "/admin/billing/invoices", label: "Invoices", icon: FileDoneOutlined }, // ✅
        { href: "/admin/billing/product", label: "Products", icon: TagsOutlined },
        { href: "/admin/billing/contract", label: "Contract", icon: FileProtectOutlined },
        { href: "/admin/billing/subscription", label: "Subscription", icon: FileProtectOutlined },
      ],
    },

    {
      label: "Content",
      icon: ContainerOutlined,
      children: [
        { href: "/admin/content", label: "Overview", icon: ContainerOutlined },
        { href: "/admin/content/publish", label: "Publish Post", icon: ProfileOutlined },
      ],
    },

    {
      label: "Newsletter",
      icon: MailOutlined,
      children: [
        { href: "/admin/newsletter", label: "Newsletter & Automations", icon: MailOutlined },
      ],
    },

    {
      label: "Work",
      icon: ProjectOutlined,
      children: [
        { href: "/admin/tickets", label: "Tickets", icon: SnippetsOutlined },
        { href: "/admin/tasks", label: "Tasks", icon: ProjectOutlined },
      ],
    },

    {
      label: "Admin",
      icon: SettingOutlined,
      children: [
        { href: "/admin/roles", label: "Roles", icon: SafetyCertificateOutlined },
        { href: "/admin/settings", label: "Settings", icon: SettingOutlined },
      ],
    },

    {
      label: "Database",
      icon: DatabaseOutlined,
      children: [
        { href: "/admin/database", label: "Overview", icon: DatabaseOutlined },
        { href: "/admin/database/management", label: "Database Management", icon: ContainerOutlined },
      ],
    },

    {
      label: "Philosophy",
      icon: BookOutlined,
      children: [
        { href: "/admin/philosophy", label: "Educational Philosophy", icon: BookOutlined },
      ],
    },
  ];

  /** Minimal menus for other roles */
  const menuItemsByRole = {
    1: adminMenu, // Admin
    2: [{ href: "/teacher", label: "Dashboard", icon: DashboardOutlined }],
    3: [{ href: "/student", label: "Dashboard", icon: DashboardOutlined }],
    4: [{ href: "/parent", label: "Dashboard", icon: DashboardOutlined }],
  };

  // (1) Force-flatten "Dashboards" into standalone links
  // (2) Flatten groups with 0 or 1 child; keep submenu only if 2+ children
  const applyFlattening = (items) =>
    items.flatMap((item) => {
      if (Array.isArray(item.children)) {
        if (item.label?.toLowerCase() === "dashboards") {
          return item.children.map((c) => ({
            href: c.href,
            label: c.label,
            icon: c.icon || item.icon || DashboardOutlined,
          }));
        }
        if (item.children.length === 0) return [];
        if (item.children.length === 1) {
          const c = item.children[0];
          return [
            { href: c.href, label: c.label || item.label, icon: c.icon || item.icon || DashboardOutlined },
          ];
        }
        return [item];
      }
      return [item];
    });

  const baseMenuItems = menuItemsByRole[roleId] || [];
  const menuItems = applyFlattening(baseMenuItems);

  // Auto-open active submenu on route change
  useEffect(() => {
    const currentPath = location.pathname;
    let opened = null;
    menuItems.forEach((item, index) => {
      if (item.children?.some((child) => currentPath.startsWith(child.href))) {
        opened = index;
      }
    });
    setOpenSubmenu(opened);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const filterMenuItems = (items) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;

    return items
      .map((item) => {
        if (item.children) {
          const children = item.children.filter((c) =>
            c.label.toLowerCase().includes(term)
          );
          return children.length ? { ...item, children } : null;
        }
        return item.label.toLowerCase().includes(term) ? item : null;
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
          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 bg-white dark:bg-gray-900">
            <div className="relative">
              <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Menu */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-1">
            {filteredItems.map((item, index) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 1;
              const isSubmenuOpen = openSubmenu === index;
              const Icon = item.icon || DashboardOutlined;

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
                          <Icon />
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
                            const ChildIcon = child.icon || DashboardOutlined;
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
                                <ChildIcon />
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
                      <Icon />
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
