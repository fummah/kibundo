// src/components/Card.jsx
const Card = ({ children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
};

const CardContent = ({ children }) => {
  return <div className="space-y-1">{children}</div>;
};

export { Card, CardContent };
