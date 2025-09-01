// src/components/Sidebar.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { Tooltip } from "antd";
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
import { ROLES } from "@/utils/roleMapper";

export default function Sidebar({ menuOpen = true, setMenuOpen = () => {} }) {
  const location = useLocation();
  const { user } = useAuthContext();
  const roleId = Number(user?.role_id);

  const [searchTerm, setSearchTerm] = useState("");
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem("sidebar_collapsed");
      return v ? JSON.parse(v) : false;
    } catch {
      return false;
    }
  });

  const isResponsive = useCallback(
    () => window.matchMedia("(max-width: 1023px)").matches,
    []
  );

  /* ----------------------------- MENUS ------------------------------ */
  const adminMenu = [
    {
      label: "Dashboards",
      icon: DashboardOutlined,
      children: [
        { href: "/admin/dashboard", label: "Overview", icon: DashboardOutlined },
        { href: "/admin/analytics", label: "Analytics", icon: BarChartOutlined },
        { href: "/admin/statistics", label: "Statistics", icon: LineChartOutlined },
        // 👇 added Student Analytics link
        { href: "/admin/analytics/students", label: "Student Analytics", icon: BarChartOutlined },
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
        { href: "/admin/academics/kibundo", label: "Kibundo AI", icon: RobotOutlined },
        { href: "/admin/academics/subjects", label: "Subjects", icon: BookOutlined },
        { href: "/admin/academics/ocr/workspace", label: "OCR Workspace", icon: FileSearchOutlined },
      ],
    },
    {
      label: "Billing",
      icon: ReconciliationOutlined,
      children: [
        { href: "/admin/billing", label: "Overview", icon: ReconciliationOutlined },
        { href: "/admin/billing/invoices", label: "Invoices", icon: FileDoneOutlined },
        { href: "/admin/billing/product", label: "Products", icon: TagsOutlined },
        { href: "/admin/billing/contract", label: "Contracts", icon: FileProtectOutlined },
        { href: "/admin/billing/subscription", label: "Subscriptions", icon: FileProtectOutlined },
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
        { href: "/admin/database/management", label: "Management", icon: ContainerOutlined },
      ],
    },
  ];

  const parentMenu = [
    {
      label: "Dashboard",
      icon: DashboardOutlined,
      children: [{ href: "/parent", label: "Overview", icon: DashboardOutlined }],
    },
    {
      label: "My Family",
      icon: TeamOutlined,
      children: [
        { href: "/parent/myfamily/family", label: "Family", icon: TeamOutlined },
        { href: "/parent/myfamily/activity", label: "Activity", icon: BarChartOutlined },
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
        { href: "/parent/communications/news", label: "News Feed", icon: FileTextOutlined },
        { href: "/parent/communications/newsletter", label: "Newsletter", icon: MailOutlined },
        { href: "/parent/communications/notifications", label: "Notifications", icon: ProfileOutlined },
      ],
    },
    {
      label: "Support",
      icon: SnippetsOutlined,
      children: [
        { href: "/parent/helpdesk/tasks", label: "Tasks", icon: ProjectOutlined },
        { href: "/parent/helpdesk/tickets", label: "Tickets", icon: SnippetsOutlined },
      ],
    },
    {
      label: "Account",
      icon: SettingOutlined,
      children: [{ href: "/parent/settings", label: "Settings", icon: SettingOutlined }],
    },
  ];

  const teacherMenu = [
    {
      label: "Teacher",
      icon: DashboardOutlined,
      children: [
        { href: "/teacher", label: "Dashboard", icon: DashboardOutlined },
        { href: "/teacher/courses", label: "Courses", icon: ReadOutlined },
        { href: "/teacher/assignments", label: "Assignments", icon: FileTextOutlined },
        { href: "/teacher/students", label: "Students", icon: TeamOutlined },
        { href: "/teacher/settings", label: "Settings", icon: SettingOutlined },
      ],
    },
  ];

  // 🔁 Student
  const studentMenu = [
    {
      label: "Student",
      icon: DashboardOutlined,
      children: [{ href: "/student/home", label: "Home", icon: DashboardOutlined }],
    },
    {
      label: "Learning",
      icon: ReadOutlined,
      children: [
        
        { href: "/student/learning/subject/math", label: "Math Practice", icon: BookOutlined },
        { href: "/student/learning/subject/science", label: "Science Practice", icon: ExperimentOutlined },
        { href: "/student/learning/subject/tech", label: "Technology Practice", icon: RobotOutlined },
        { href: "/student/learning/subject/german", label: "German Practice", icon: ReadOutlined },
      ],
    },
    {
      label: "Reading",
      icon: BookOutlined,
      children: [
        { href: "/student/reading", label: "Overview", icon: BookOutlined },
        { href: "/student/reading/read-aloud", label: "Read Aloud", icon: FileTextOutlined },
        { href: "/student/reading/ai-text", label: "AI Reading Text", icon: RobotOutlined },
        { href: "/student/reading/quiz", label: "Reading Quiz", icon: ExperimentOutlined },
      ],
    },
    {
      label: "Homework",
      icon: FileSearchOutlined,
      children: [
        { href: "/student/homework", label: "Overview", icon: FileSearchOutlined },
        { href: "/student/homework/interaction", label: "Interaction", icon: RobotOutlined },
        { href: "/student/homework/tasks", label: "Task List", icon: ProfileOutlined },
        { href: "/student/homework/review", label: "Review & Submit", icon: FileDoneOutlined },
      ],
    },
    {
      label: "Progress",
      icon: ProjectOutlined,
      children: [
        { href: "/student/map", label: "Treasure Map", icon: ProjectOutlined },
        { href: "/student/motivation", label: "Motivation Timer", icon: ExperimentOutlined },
      ],
    },
    {
      label: "Onboarding",
      icon: RobotOutlined,
      children: [
        { href: "/student/onboarding/buddy", label: "Buddy Select", icon: RobotOutlined },
        { href: "/student/onboarding/interests", label: "Interests Wizard", icon: ReadOutlined },
      ],
    },
    {
      label: "Settings",
      icon: SettingOutlined,
      children: [{ href: "/student/settings", label: "Settings", icon: SettingOutlined }],
    },
  ];

  // Map by canonical role constants
  const menuItemsByRole = useMemo(
    () => ({
      [ROLES.ADMIN]: adminMenu,
      [ROLES.TEACHER]: teacherMenu,
      [ROLES.STUDENT]: studentMenu,
      [ROLES.PARENT]: parentMenu,
    }),
    [] // static menus
  );

  const baseMenuItems = menuItemsByRole[roleId] || [];

  /* ----------------------------- SEARCH FILTER ------------------------------ */
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredMenu = useMemo(() => {
    if (!normalizedQuery) return baseMenuItems;

    const match = (txt = "") => txt.toLowerCase().includes(normalizedQuery);

    return baseMenuItems
      .map((group) => {
        if (!Array.isArray(group.children)) {
          return match(group.label) ? group : null;
        }
        const keptChildren = group.children.filter(
          (c) => match(c.label) || match(c.href)
        );
        if (keptChildren.length > 0 || match(group.label)) {
          return { ...group, children: keptChildren.length ? keptChildren : group.children };
        }
        return null;
      })
      .filter(Boolean);
  }, [baseMenuItems, normalizedQuery]);

  /* ----------------------------- EFFECTS ------------------------------ */
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", JSON.stringify(isCollapsed));
    } catch {}
  }, [isCollapsed]);

  // Auto close on route change (mobile) + open current submenu
  useEffect(() => {
    if (isResponsive()) setMenuOpen(false);

    const current = location.pathname;
    let opened = null;

    (baseMenuItems || []).forEach((item, idx) => {
      if (Array.isArray(item.children) && item.children.some((c) => current.startsWith(c.href))) {
        opened = idx;
      }
    });
    setOpenSubmenu(opened);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMenuOpen]);

  /* ----------------------------- RENDER HELPERS ------------------------------ */
  const currentPath = location.pathname;

  const isActive = useCallback(
    (href) => currentPath === href || currentPath.startsWith(href + "/"),
    [currentPath]
  );

  const isGroupActive = useCallback(
    (children = []) => children.some((c) => isActive(c.href)),
    [isActive]
  );

  const asideWidth = isCollapsed ? "w-16" : "w-64";

  const ItemLink = ({ to, Icon, label, active }) => {
    const cls = active
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-white font-semibold"
      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800";

    const content = (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${cls}`}>
        <Icon />
        {!isCollapsed && <span>{label}</span>}
      </div>
    );

    return isCollapsed ? (
      <Tooltip placement="right" title={label}>
        <Link to={to}>{content}</Link>
      </Tooltip>
    ) : (
      <Link to={to}>{content}</Link>
    );
  };

  /* ----------------------------- RENDER ------------------------------ */
  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-16 left-0 z-40 ${asideWidth} h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r dark:border-gray-700 shadow-lg transform transition-all duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full">
          {!isCollapsed && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-20">
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
          )}

          <nav className="flex-1 overflow-y-auto px-2 pt-4 pb-2 space-y-1">
            {filteredMenu.map((item, idx) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const IconComp = item.icon;

              if (!hasChildren && item.href) {
                return (
                  <ItemLink
                    key={idx}
                    to={item.href}
                    Icon={IconComp}
                    label={item.label}
                    active={isActive(item.href)}
                  />
                );
              }

              const groupActive = isGroupActive(item.children);

              return (
                <div key={idx}>
                  <button
                    onClick={() => setOpenSubmenu(openSubmenu === idx ? null : idx)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition ${
                      openSubmenu === idx || groupActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <IconComp /> {!isCollapsed && item.label}
                    </span>
                    {!isCollapsed && (
                      <svg
                        className={`w-4 h-4 transform transition-transform ${
                          openSubmenu === idx || groupActive ? "rotate-90" : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M6 6l6 4-6 4V6z" />
                      </svg>
                    )}
                  </button>

                  {(openSubmenu === idx || groupActive) && (
                    <div className="ml-5 mt-1 space-y-1">
                      {item.children.map((child, subIdx) => {
                        const ChildIcon = child.icon;
                        return (
                          <ItemLink
                            key={subIdx}
                            to={child.href}
                            Icon={ChildIcon}
                            label={child.label}
                            active={isActive(child.href)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 p-2">
            <button
              onClick={() =>
                isResponsive() ? setMenuOpen(false) : setIsCollapsed((v) => !v)
              }
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
            >
              {isResponsive() ? "Close" : isCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
