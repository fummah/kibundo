export default function TeacherStudents() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">👥 My Students</h2>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        <li className="py-3 flex justify-between">
          <span>Jane Moyo</span>
          <span className="text-sm text-gray-500">Grade 5</span>
        </li>
        <li className="py-3 flex justify-between">
          <span>Thabo Dlamini</span>
          <span className="text-sm text-gray-500">Grade 6</span>
        </li>
        <li className="py-3 flex justify-between">
          <span>Amara Nyathi</span>
          <span className="text-sm text-gray-500">Grade 5</span>
        </li>
      </ul>
    </div>
  );
}
