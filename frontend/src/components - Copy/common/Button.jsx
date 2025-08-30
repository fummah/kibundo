import React from "react";

export default function Button({ children, variant = "primary", ...props }) {
  const base =
    "px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2";
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 focus:ring-gray-400",
  };
  return (
    <button className={\`\${base} \${styles[variant]}\`} {...props}>
      {children}
    </button>
  );
}