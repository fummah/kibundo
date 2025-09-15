import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import learningBot from "../../assets/learning-bot.json";
import BackgroundShell from "@/components/student/mobile/BackgroundShell";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
      <BackgroundShell>
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-blue-100 to-purple-100 text-gray-800 dark:text-white">
      {/* 🧠 Titel */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
        Willkommen bei <span className="text-indigo-600">Kibundo Learning</span>
      </h1>

      {/* 📘 Beschreibung */}
      <p className="text-center text-gray-700 dark:text-gray-300 max-w-2xl mb-6 text-lg">
        Wir unterstützen <span className="font-semibold">Schüler</span>,{" "}
        <span className="font-semibold">Lehrer</span> und{" "}
        <span className="font-semibold">Eltern</span> mit interaktiven
        Lernwerkzeugen, Fortschrittsverfolgung und gemeinsamer Zusammenarbeit.
      </p>

      {/* 🎞️ Animation */}
      <Lottie
        animationData={learningBot}
        loop
        className="w-full max-w-md mb-6"
      />

      {/* 🚀 Start-Button */}
      <button
        onClick={() => navigate("/signin")}
        className="px-10 py-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold shadow-lg transition"
      >
        Starten
      </button>

      {/* 🌙 Hinweis auf Theme-Umschalter (optional) */}
      {/* Hier könnte in Zukunft ein Theme-Umschalter hinzugefügt werden */}
    </div>
      </BackgroundShell>
  );
}
