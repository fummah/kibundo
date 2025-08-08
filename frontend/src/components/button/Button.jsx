import React from "react";

const Button = ({ children, onClick, variant = "default" }) => {
  const base =
    "px-4 py-2 rounded-md font-medium transition focus:outline-none";

  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
};

export { Button };
