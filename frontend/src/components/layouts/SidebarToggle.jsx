import React from "react";
import { Menu, X } from "lucide-react";

export default function SidebarToggle({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle menu"
    >
      {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );
}