export default function TeacherAssignments() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📝 Assignments</h2>
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Algebra Homework</h3>
          <p className="text-sm text-gray-500">Due: Aug 5, 2025</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Science Lab Report</h3>
          <p className="text-sm text-gray-500">Due: Aug 8, 2025</p>
        </div>
      </div>
    </div>
  );
}
