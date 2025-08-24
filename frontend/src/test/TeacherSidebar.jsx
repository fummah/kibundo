// src/components/sidebars/TeacherSidebar.jsx
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  FileText,
  Settings,
  Search,
} from "lucide-react";

const teacherMenuItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/courses", label: "My Courses", icon: BookOpen },
  { href: "/teacher/assignments", label: "Manage Assignments", icon: ClipboardList },
  { href: "/teacher/students", label: "My Students", icon: Users },
  { href: "/teacher/reports", label: "Reports", icon: FileText },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export default function TeacherSidebar() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = teacherMenuItems.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-md">
      <div className="h-full flex flex-col pt-16 md:pt-4">
        {/* Search */}
        <div className="sticky top-16 z-20 bg-white dark:bg-gray-900 px-4 py-3 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {filteredItems.map(({ href, label, icon: Icon }, index) => (
            <a
              key={index}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm"
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
