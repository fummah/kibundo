export default function SidebarItem({ icon: Icon, label, href, active, collapsed, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm ${
        active
          ? "bg-indigo-100 dark:bg-gray-700 text-indigo-600"
          : "text-gray-700 dark:text-gray-200"
      }`}
    >
      <Icon className="w-5 h-5" />
      {!collapsed && <span>{label}</span>}
    </a>
  );
}
