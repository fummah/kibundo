import React from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import ParentShell from "@/components/parent/ParentShell.jsx";
import HeroBackdrop from "@/components/parent/HeroBackdrop";
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function AddStudentIntro() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ParentShell bgImage={globalBg}>
      <HeroBackdrop
        showBuddy
        buddySize={280}
        buddyTop={76}             // lower the buddy a touch to give header room
        headerTop={20}
        contentClassName="pb-24"
        header={
          <h2 className="text-center text-[28px] font-extrabold text-neutral-800">
            {t("parent.addChild.intro.kicker", "Los geht‘s")}
          </h2>
        }
      >
        {/* Headline (below buddy) */}
        <h1 className="mt-2 text-center font-extrabold leading-tight text-[28px] md:text-[34px] text-lime-700">
          {t("parent.addChild.intro.headline", "Lege jetzt einen Account für Dein Kind an")}
        </h1>

        {/* Copy */}
        <p className="mx-auto mt-4 max-w-[640px] text-center text-[15px] md:text-[16px] text-neutral-600">
          {t(
            "parent.addChild.intro.copy",
            "Damit dein Kind die App selbstständig und sicher nutzen kann, legst du jetzt den Kinderaccount an."
          )}
        </p>

        {/* CTA */}
        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/parent/myfamily/family?add-student=1")}
            className="group w-full max-w-[420px] rounded-[20px] bg-white shadow-[0_14px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 px-6 py-5 transition active:scale-[0.995] hover:shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
          >
            <div className="flex items-center gap-4 justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#ffa64d] to-[#ff7a1a] text-white shadow-[0_10px_18px_rgba(255,122,26,0.35)]">
                <PlusOutlined className="text-xl" />
              </span>
              <span className="text-[18px] md:text-[20px] font-extrabold text-orange-600 group-hover:text-orange-700">
                {t("parent.addChild.intro.cta", "Kind hinzufügen")}
              </span>
            </div>
          </button>
        </div>

        {/* DSGVO note */}
        <p className="mx-auto mt-6 max-w-[640px] text-center text-[16px] leading-snug text-neutral-500">
          {t(
            "parent.addChild.intro.gdpr",
            "DSGV Konform. Die Daten liegen sicher verschlüsselt auf einem Server in Deutschland und werden niemals ohne ihre ausdrückliche Zustimmung an Dritte weitergegeben."
          )}
        </p>

      </HeroBackdrop>
    </ParentShell>
  );
}
