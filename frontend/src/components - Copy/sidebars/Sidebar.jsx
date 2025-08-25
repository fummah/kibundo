// Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
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
  FileDoneOutlined,
  MailOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "@/context/AuthContext";

/**
 * Props:
 * - menuOpen?: boolean
 * - setMenuOpen?: (open:boolean)=>void
 */
export default function Sidebar({ menuOpen = true, setMenuOpen = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const roleId = Number(user?.role_id);

  const [searchTerm, setSearchTerm] = useState("");
  const [openSubmenu, setOpenSubmenu] = useState(null);

  /** ---------------- Admin Menu ---------------- */
  const adminMenu = [
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
        { href: "/admin/academics/ai-agent", label: "Kibundo (Manage & Train)", icon: RobotOutlined },
        { href: "/admin/academics/subjects", label: "Subjects", icon: BookOutlined },
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
        { href: "/admin/billing/invoices", label: "Invoices", icon: FileDoneOutlined },
        { href: "/admin/billing/product", label: "Products", icon: TagsOutlined },
        { href: "/admin/billing/contract", label: "Contract", icon: FileProtectOutlined },
        { href: "/admin/billing/subscription", label: "Subscription", icon: FileProtectOutlined },
        { href: "/admin/billing/coupons", label: "Coupons", icon: GiftOutlined },
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
      children: [{ href: "/admin/newsletter", label: "Newsletter & Automations", icon: MailOutlined }],
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
  ];

  /** ---------------- Parent Menu (aligned to your current routes) ---------------- */
  const parentMenu = [
    {
      label: "Dashboards",
      icon: DashboardOutlined,
      children: [{ href: "/parent", label: "Parent Dashboard", icon: DashboardOutlined }],
    },
    {
      label: "My Family",
      icon: TeamOutlined,
      children: [
        { href: "/parent/family", label: "Family", icon: TeamOutlined },
        { href: "/parent/family/activity", label: "Activity", icon: BarChartOutlined },
        { href: "/parent/family/add", label: "Add Student", icon: BarChartOutlined },
      ],
    },
    {
      label: "Learning",
      icon: ReadOutlined,
      children: [
        { href: "/parent/learning/scans", label: "Scans", icon: FileSearchOutlined },
        { href: "/parent/learning/resources", label: "Resources", icon: BookOutlined },
      ],
    },
    {
      label: "Billing",
      icon: ReconciliationOutlined,
      children: [
        { href: "/parent/billing/overview", label: "Overview", icon: ReconciliationOutlined },
        { href: "/parent/billing/subscription", label: "Subscription", icon: FileProtectOutlined },
        { href: "/parent/billing/invoices", label: "Invoices", icon: FileDoneOutlined },
        { href: "/parent/billing/coupons", label: "Coupons", icon: GiftOutlined },
      ],
    },
    {
      label: "Communications",
      icon: MailOutlined,
      children: [
        { href: "/parent/comms/newsletter", label: "Newsletter", icon: MailOutlined },
        { href: "/parent/comms/notifications", label: "Notifications", icon: ProfileOutlined },
        { href: "/parent/news", label: "News Feed", icon: FileTextOutlined },
      ],
    },
    {
      label: "Support",
      icon: SnippetsOutlined,
      children: [{ href: "/parent/support", label: "Help & Tickets", icon: SnippetsOutlined }],
    },
    {
      label: "Account",
      icon: SettingOutlined,
      children: [{ href: "/parent/settings", label: "Settings", icon: SettingOutlined }],
    },
  ];

  /** ---------------- Teacher / Student minimal ---------------- */
  const teacherMenu = [{ href: "/teacher", label: "Dashboard", icon: DashboardOutlined }];
  const studentMenu = [{ href: "/student", label: "Dashboard", icon: DashboardOutlined }];

  /** ---------------- Role → Menu map ---------------- */
  const menuItemsByRole = useMemo(
    () => ({
      1: adminMenu,
      2: teacherMenu,
      3: studentMenu,
      4: parentMenu,
    }),
    []
  );

  /** Flatten rules:
   *  - "Dashboards" becomes direct links
   *  - groups with 0/1 child become direct links
   */
  const applyFlattening = (items) =>
    items.flatMap((item) => {
      if (Array.isArray(item.children)) {
        if ((item.label || "").toLowerCase() === "dashboards") {
          return item.children.map((c) => ({
            href: c.href,
            label: c.label,
            icon: c.icon || item.icon || DashboardOutlined,
          }));
        }
        if (item.children.length === 0) return [];
        if (item.children.length === 1) {
          const c = item.children[0];
          return [{ href: c.href, label: c.label || item.label, icon: c.icon || item.icon || DashboardOutlined }];
        }
        return [item]; // keep as submenu (2+ children)
      }
      return [item];
    });

  const baseMenuItems = menuItemsByRole[roleId] || [];
  const menuItems = applyFlattening(baseMenuItems);

  // open the active submenu on route change
  useEffect(() => {
    const current = location.pathname;
    let opened = null;
    menuItems.forEach((item, idx) => {
      if (item.children?.some((c) => current.startsWith(c.href))) {
        opened = idx;
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
          const children = item.children.filter((c) => c.label.toLowerCase().includes(term));
          return children.length ? { ...item, children } : null;
        }
        return item.label.toLowerCase().includes(term) ? item : null;
      })
      .filter(Boolean);
  };

  const filteredItems = filterMenuItems(menuItems);
  const currentPath = location.pathname;

  const isActive = (href) => currentPath === href || currentPath.startsWith(href + "/");

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden" onClick={() => setMenuOpen(false)} />
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

              if (!hasChildren) {
                // direct link
                return (
                  <Link
                    key={index}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                      isActive(item.href)
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-white font-semibold"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              // submenu with a default landing (first child)
              const defaultHref = item.children[0]?.href;

              return (
                <div key={index} className="group">
                  <div
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm ${
                      isSubmenuOpen
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {/* Left: icon + label navigates to default page */}
                    <button
                      onClick={() => {
                        if (defaultHref) {
                          navigate(defaultHref);
                          setMenuOpen(false);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Icon />
                      {item.label}
                    </button>

                    {/* Right: chevron toggles open/close only */}
                    <button
                      onClick={() => setOpenSubmenu(isSubmenuOpen ? null : index)}
                      className="ml-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label={isSubmenuOpen ? "Collapse" : "Expand"}
                    >
                      <svg
                        className={`w-4 h-4 transform transition-transform ${isSubmenuOpen ? "rotate-90" : ""}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M6 6l6 4-6 4V6z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {isSubmenuOpen && (
                    <div className="ml-5 mt-1 space-y-1">
                      {item.children.map((child, subIdx) => {
                        const ChildIcon = child.icon || DashboardOutlined;
                        const active = isActive(child.href);
                        return (
                          <Link
                            key={subIdx}
                            to={child.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition ${
                              active
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
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
