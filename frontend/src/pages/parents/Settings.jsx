export default function Settings() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">⚙️ Account Settings</h2>
      <p className="text-gray-600 dark:text-gray-300">
        Manage your profile, notifications, and account preferences here.
      </p>

      <div className="mt-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
        <label className="block mb-2 text-sm font-medium">Notification Email</label>
        <input
          type="email"
          placeholder="your@email.com"
          className="w-full p-2 border rounded bg-slate-100 dark:bg-slate-700"
        />
      </div>
    </div>
  );
}
