export default function ParentDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">👪 Parent Dashboard</h2>
      <p className="text-gray-600 dark:text-gray-300">
        Welcome! Here's an overview of your children’s academic progress.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold">Children Enrolled</h3>
          <p className="text-2xl">2</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold">Reports Available</h3>
          <p className="text-2xl">4</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold">Upcoming Meetings</h3>
          <p className="text-2xl">1</p>
        </div>
      </div>
    </div>
  );
}
