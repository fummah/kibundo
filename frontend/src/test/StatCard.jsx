import React from "react";

const StatCard = ({ icon, label, value }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full text-blue-600 dark:text-blue-300">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
