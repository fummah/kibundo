import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import learningBot from "../../assets/learning-bot.json";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-blue-100 to-purple-100 text-gray-800 dark:text-white">
      {/* 🧠 Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
        Welcome to <span className="text-indigo-600">Kibundo Learning</span>
      </h1>

      {/* 📘 Description */}
      <p className="text-center text-gray-700 dark:text-gray-300 max-w-2xl mb-6 text-lg">
        Empowering <span className="font-semibold">Students</span>, <span className="font-semibold">Teachers</span>, and <span className="font-semibold">Parents</span> with interactive learning tools, progress tracking, and collaborative engagement.
      </p>

      {/* 🎞️ Animation */}
      <Lottie
        animationData={learningBot}
        loop
        className="w-full max-w-md mb-6"
      />

      {/* 🚀 Start Button */}
      <button
        onClick={() => navigate("/signin")}
        className="px-10 py-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold shadow-lg transition"
      >
        Start
      </button>

      {/* 🌙 Theme switch suggestion (optional) */}
      {/* You can add a theme toggle button here in future if needed */}
    </div>
  );
}
