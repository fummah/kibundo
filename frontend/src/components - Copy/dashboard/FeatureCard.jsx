import React from "react";

export default function FeatureCard({ title, desc }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow border border-gray-100">
      <h3 className="text-md font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}