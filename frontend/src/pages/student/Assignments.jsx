export default function StudentAssignments() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📄 Assignments</h2>
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Fractions Practice</h3>
          <p className="text-sm text-gray-500">Due: Aug 10, 2025</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Science Experiment Write-up</h3>
          <p className="text-sm text-gray-500">Due: Aug 12, 2025</p>
        </div>
      </div>
    </div>
  );
}
