export default function TeacherCourses() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📚 My Courses</h2>
      <ul className="space-y-3">
        <li className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Mathematics Grade 5</h3>
          <p className="text-sm text-gray-500">20 students enrolled</p>
        </li>
        <li className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Science Grade 6</h3>
          <p className="text-sm text-gray-500">15 students enrolled</p>
        </li>
      </ul>
    </div>
  );
}
