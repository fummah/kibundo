export default function StudentCourses() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📘 My Courses</h2>
      <ul className="space-y-3">
        <li className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Mathematics</h3>
          <p className="text-sm text-gray-500">Instructor: Mr. Nyathi</p>
        </li>
        <li className="bg-white dark:bg-slate-800 p-4 rounded shadow">
          <h3 className="font-semibold">Science</h3>
          <p className="text-sm text-gray-500">Instructor: Mrs. Moyo</p>
        </li>
      </ul>
    </div>
  );
}
