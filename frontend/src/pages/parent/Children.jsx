export default function Children() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">👶 My Children</h2>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        <li className="py-3 flex justify-between">
          <span>Emily Matenda</span>
          <span className="text-sm text-gray-500">Grade 3</span>
        </li>
        <li className="py-3 flex justify-between">
          <span>Jayden Matenda</span>
          <span className="text-sm text-gray-500">Grade 1</span>
        </li>
      </ul>
    </div>
  );
}
