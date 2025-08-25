import React from "react";

export function Heading({ level = 1, children }) {
  const Tag = \`h\${level}\`;
  return <Tag className="font-bold text-gray-800">{children}</Tag>;
}

export function Paragraph({ children }) {
  return <p className="text-gray-600">{children}</p>;
}