import { useState } from "react";
import { useLocation, Link, Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { Layout } from "antd";
import Sidebar from "../sidebars/Sidebar";
import GlobalNavBar from "./GlobalNavBar";
import { useAuthContext } from "../../context/AuthContext";

const { Content } = Layout;

export default function BodyLayout() {
  const { user, isAuthenticated } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((part, idx, arr) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
      path: "/" + arr.slice(0, idx + 1).join("/"),
    }));

  return (
    <div className="w-full min-h-screen flex flex-col bg-gradient-to-tr from-[#dbeafe] via-white to-[#ede9fe] text-gray-800 dark:text-white overflow-x-hidden">
      {/* 🌐 Top Navigation */}
      <GlobalNavBar onToggleSidebar={() => setMenuOpen(!menuOpen)} />

      <div className="flex flex-1 pt-16">
        {/* 📱 Mobile Sidebar */}
        {isAuthenticated && (
          <div
            className={`fixed top-0 left-0 z-40 w-64 h-full bg-white dark:bg-gray-900 border-r shadow-lg transform transition-transform duration-300 ease-in-out ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            } md:hidden`}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                Kibundo
              </h2>
              <button onClick={() => setMenuOpen(false)}>
                <X className="text-gray-600 dark:text-white" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <Sidebar role={user?.role} onLinkClick={() => setMenuOpen(false)} />
            </nav>
          </div>
        )}

        {/* 🔲 Overlay */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* 🖥️ Desktop Sidebar */}
        {isAuthenticated && (
          <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r fixed top-0 left-0 h-full z-30 pt-16">
            <div className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 text-2xl border-b border-gray-200 dark:border-gray-700">
              Kibundo
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <Sidebar role={user?.role} />
            </nav>
          </aside>
        )}

        {/* 📄 Main Content */}
        <div className={`flex-1 flex flex-col dark:text-white dark:bg-gray-900 ${isAuthenticated ? "md:ml-64" : ""} overflow-hidden`}>
          {/* 🧭 Breadcrumbs */}
          {isAuthenticated && (
            <div className="text-sm text-gray-600 dark:text-white flex flex-wrap gap-1 px-4 py-3">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx}>
                  {idx > 0 && <span className="mx-1">/</span>}
                  <Link to={crumb.path} className="hover:underline text-blue-600 dark:text-blue-400">
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </div>
          )}

          {/* 📦 Page Content Area */}
          <Content className="flex-1 overflow-y-auto p-4">
            <div className="max-w-screen-xl w-full mx-auto">
              <Outlet />
            </div>
          </Content>
        </div>
      </div>
    </div>
  );
}
