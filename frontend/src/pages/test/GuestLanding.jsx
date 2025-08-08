// src/pages/auth/AuthLanding.jsx
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import learningBot from "../../assets/learning-bot.json";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-white text-gray-800">
      {/* 🐉 Mascot Animation */}
      <div className="w-64 sm:w-72 md:w-80 mb-6">
        <Lottie animationData={learningBot} loop />
      </div>

      {/* 📛 App Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">Kibundo</h1>

      {/* 🧾 Slogan */}
      <p className="text-center text-sm sm:text-base text-gray-600 mb-8">
        Hausaufgaben mit Spaß – Slogan kommt hier rein
      </p>

      {/* 🚀 Starten Button */}
      <button
        onClick={() => navigate("/choose-role")}
        className="bg-rose-300 hover:bg-rose-400 text-white text-lg px-8 py-3 rounded-full shadow-md transition"
      >
        Starten
      </button>
    </div>
  );
}
