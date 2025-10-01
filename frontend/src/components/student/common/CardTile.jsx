
// src/components/student/common/CardTile.jsx
import React from "react";
import { Card } from "antd";

export default function CardTile({ img, title, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`w-full text-left ${className}`} aria-label={title}>
      <Card
        hoverable
        className="rounded-2xl border-0 !p-0 overflow-hidden shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <img
          src={img}
          alt={title}
          className="w-full h-36 object-cover"
          loading="eager"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://via.placeholder.com/800x360.png?text=Reading";
          }}
        />
        <div className="px-3 py-3">
          <div className="font-semibold">{title}</div>
        </div>
      </Card>
    </button>
  );
}
