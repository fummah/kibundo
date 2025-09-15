// src/pages/parent/myfamily/AddAnotherChildIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import DeviceFrame from "@/components/student/mobile/DeviceFrame";
import HeroBackdrop from "@/components/parent/HeroBackdrop";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";

export default function AddAnotherChildIntro() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <DeviceFrame showFooterChat={false} className="bg-neutral-100">
      <HeroBackdrop
        showBuddy
        buddySize={280}
        buddyTop={76}            // space for the “Los geht's” header
        headerTop={20}
        contentPadTop={680}      // keep paragraphs below mascot
        contentClassName="pb-24"
        header={
          <h2 className="text-center text-[16px] font-extrabold text-neutral-800">
            {t("parent.addChild.intro.kicker", "Los geht‘s")}
          </h2>
        }
      >
        {/* Headline */}
        <h1 className="mt-2 text-center font-extrabold leading-tight text-[28px] md:text-[34px] text-lime-700">
          {t("parent.addChild.more.headline", "Weiteres Kind anlegen")}
        </h1>

        {/* Copy (16px) */}
        <div className="mx-auto mt-3 max-w-[640px] text-center text-[16px] text-neutral-600 space-y-1">
          <p>
            {t(
              "parent.addChild.more.copy1",
              "Du kannst für mehrere Kinder Konten hinzufügen."
            )}
          </p>
          <p>
            {t(
              "parent.addChild.more.copy2",
              "Das Hinzufügen ist jederzeit auch nachträglich möglich. Für jedes weitere Kind erhältst du eine Vergünstigung."
            )}
          </p>
        </div>

        {/* Primary CTA (card style) */}
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

        {/* Secondary CTA (Skip) */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/parent/home")}
            className="w-full max-w-[420px] h-12 rounded-full bg-[#ff7a1a] text-white font-semibold shadow-[0_10px_24px_rgba(255,122,26,0.35)] active:scale-[0.995] transition hover:bg-[#e86d18]"
          >
            {t("parent.addChild.more.skip", "Skip")}
          </button>
        </div>

        {/* Spacer + Bottom tabs */}
        <ParentTabSpacer />
        <BottomTabBar />
      </HeroBackdrop>
    </DeviceFrame>
  );
}
