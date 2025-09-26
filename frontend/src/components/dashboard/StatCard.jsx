import React from "react";

export default function StatCard({ label, value }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
