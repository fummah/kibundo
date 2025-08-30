import React from "react";

const FeatureCard = ({ icon, title, desc }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl shadow border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3 text-blue-500">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
          {icon}
        </div>
        <h3 className="text-md font-bold text-gray-800 dark:text-white">
          {title}
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
};

export default FeatureCard;
