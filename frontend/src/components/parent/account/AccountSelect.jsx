// C:\wamp64\www\kibundo\frontend\src\components\parent\account\AccountSelect.jsx

import { Link } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext"; // ✅ use AuthContext now

// Demo users – replace avatars with your real assets
const users = [
  {
    id: "child1",
    name: "Name Child one",
    type: "child",
    avatar: "/assets/avatars/child1.png",
  },
  {
    id: "child2",
    name: "Name Child two",
    type: "child",
    avatar: "/assets/avatars/child2.png",
  },
  {
    id: "parent",
    name: "Parents",
    type: "parent",
    avatar: "/assets/avatars/parent.png",
  },
];

export default function AccountSelect() {
  const { setAccount } = useAuthContext(); // ✅ comes from AuthContext now

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-orange-100 via-orange-50 to-cyan-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3">
        <button
          onClick={() => window.history.back()}
          className="text-2xl font-bold text-gray-700"
        >
          &larr;
        </button>
        <h1 className="flex-1 text-center text-xl font-extrabold text-gray-800">
          Account
        </h1>
        <div className="w-8" /> {/* spacer for symmetry */}
      </header>

      {/* Question */}
      <div className="px-6 py-4">
        <p className="text-gray-700 font-medium text-lg">Wer bist Du?</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4 px-4 pb-8">
        {users.map((u) => (
          <Link
            key={u.id}
            to={u.type === "parent" ? "/parent/home" : `/student/${u.id}`}
            onClick={() => setAccount(u)}
            className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-200 px-4 py-3 hover:bg-white transition"
          >
            <img
              src={u.avatar}
              alt={u.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <span className="font-semibold text-gray-800">{u.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
