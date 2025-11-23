// src/pages/parent/myfamily/AddAnotherChildIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

// ParentShell is now handled at route level
import CircularBackground from "@/components/layouts/CircularBackground";
import buddyImg from "@/assets/buddies/kibundo-buddy.png";

export default function AddAnotherChildIntro() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <CircularBackground>
      {/* Header ABOVE buddy */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[5] px-4 sm:px-6 w-full"
        style={{ top: `calc(env(safe-area-inset-top) + 20px)` }}
      >
        <h2 className="text-center text-[16px] font-extrabold text-neutral-800">
          {t("parent.addChild.intro.kicker", "Los geht's")}
        </h2>
      </div>

      {/* Buddy - positioned in bottom half */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[4]"
        style={{ 
          bottom: 'calc(50% - 60px)'
        }}
      >
        <img
          src={buddyImg}
          alt="Kibundo Buddy"
          width={120}
          height={120}
          className="mx-auto drop-shadow-[0_18px_32px_rgba(0,0,0,0.18)] select-none"
          draggable={false}
        />
      </div>

      {/* Content at the bottom feet of the buddy */}
      <div className="flex flex-col items-center text-center px-4 sm:px-6 w-full" style={{ marginTop: 'calc(50vh + 60px)' }}>
        {/* Header */}
        <h2 className="text-center text-[16px] font-extrabold text-neutral-800 mt-6">
          {t("parent.addChild.intro.kicker", "Los geht's")}
        </h2>

        {/* Headline */}
        <h1 className="mt-4 sm:mt-6 text-center font-extrabold leading-tight text-xl sm:text-[28px] md:text-[34px] text-lime-700">
          {t("parent.addChild.more.headline", "Weiteres Kind anlegen")}
        </h1>

        {/* Copy (16px) */}
        <div className="mx-auto mt-3 max-w-[640px] text-center text-sm sm:text-[15px] md:text-[16px] text-neutral-600 space-y-1">
          <p>
            {t(
              "parent.addChild.more.copy1",
              "Du kannst mehrere Kinder anlegen."
            )}
          </p>
          <p>
            {t(
              "parent.addChild.more.copy2",
              "Das Hinzufügen ist jederzeit auch nachträglich möglich."
            )}
          </p>
        </div>

        {/* Primary CTA (card style) - Add another child */}
        <div className="mt-7 flex justify-center w-full">
          <button
            type="button"
            onClick={() => navigate("/parent/myfamily/add-student-flow?step=0")}
            className="group w-full max-w-[600px] md:max-w-[800px] rounded-[20px] bg-white shadow-[0_14px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 px-6 py-5 transition active:scale-[0.995] hover:shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
          >
            <div className="flex items-center gap-4 justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#ffa64d] to-[#ff7a1a] text-white shadow-[0_10px_18px_rgba(255,122,26,0.35)]">
                <PlusOutlined className="text-xl" />
              </span>
              <span className="text-[18px] md:text-[20px] font-extrabold text-orange-600 group-hover:text-orange-700">
                {t("parent.addChild.more.cta", "Weiteres Kind hinzufügen")}
              </span>
            </div>
          </button>
        </div>

        {/* Secondary CTA (Skip) */}
        <div className="mt-4 flex justify-center w-full">
          <button
            type="button"
            onClick={() => navigate("/parent/home")}
            className="w-full max-w-[600px] md:max-w-[800px] h-12 rounded-full bg-[#ff7a1a] text-white font-semibold shadow-[0_10px_24px_rgba(255,122,26,0.35)] active:scale-[0.995] transition hover:bg-[#e86d18]"
          >
            {t("parent.addChild.more.skip", "Skip")}
          </button>
        </div>
      </div>
    </CircularBackground>
  );
}
