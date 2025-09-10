// src/pages/parent/ParentHome.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ParentShell from "@/components/parent/ParentShell";
// ✅ explicit extension + alias to avoid any shadowing
import ParentNewsCard from "@/components/parent/NewsCard.jsx";

/* Assets */
import globalBg from "@/assets/backgrounds/global-bg.png";
import childOne from "@/assets/parent/childone.png";
import childTwo from "@/assets/parent/childtwo.png";
import blogNews from "@/assets/parent/blognews.png";
import platNews from "@/assets/parent/platnews.png";
import unkCat from "@/assets/parent/unkcat.png";

/* ---------------- Dummy content ---------------- */
const CHILDREN = [
  { id: 1, name: "Name Child one", meta: "Age X, Grade 3", avatar: childOne },
  { id: 2, name: "Name Child two", meta: "Age X, Grade 1", avatar: childTwo },
];

const ACTIVITIES = [
  { id: 1, childId: 1, child: "Name Child one", text: "Completed a math lesson for homework", when: "Today 14:20", tag: "Math", avatar: childOne },
  { id: 2, childId: 2, child: "Name Child two", text: "Started a reading exercise", when: "Yesterday 17:05", tag: "Reading", avatar: childTwo },
];

const NEWS = [
  { id: 1, tag: "Blog Post", title: "Tips for Encouraging Reading", desc: "Learn how to foster a love for reading in your child.", image: blogNews },
  { id: 2, tag: "Platform update", title: "New Math Games Added", desc: "Explore the latest math games designed to make learning fun.", image: platNews },
  { id: 3, tag: "Unknown Category", title: "Further Chapter Headline", desc: "Explore the latest math games designed to make learning fun.", image: unkCat },
];

/* ---------------- Small mobile cards ---------------- */
function ActivityCard({ to, avatar, name, text, bg = "bg-cyan-200" }) {
  return (
    <Link
      to={to}
      className={`block w-full ${bg} rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/60 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
    >
      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full ring-4 ring-white/60 object-cover" />
        <div className="flex-1">
          <div className="font-extrabold text-neutral-800">{name}</div>
          <div className="text-neutral-700">{text}</div>
        </div>
      </div>
    </Link>
  );
}

function ChildBubble({ to, avatar, name, meta }) {
  return (
    <Link
      to={to}
      className="shrink-0 flex flex-col items-center text-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-4 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-lg">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold text-neutral-800 leading-tight">{name}</div>
      <div className="text-xs text-neutral-500">{meta}</div>
    </Link>
  );
}

/* ---------------- Page ---------------- */
export default function ParentHome() {
  const { t } = useTranslation();

  return (
    <ParentShell title={t("parent.home.title", "Home")} showBack={false} bgImage={globalBg}>
      <div className="w-full flex justify-center">
        <section className="relative w-full max-w-[520px] px-4 pt-6 mx-auto space-y-6">
          <h1 className="text-3xl font-extrabold text-neutral-800 text-center">
            {t("parent.home.title", "Home")}
          </h1>

          {/* Activities */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">
              {t("parent.home.activities", "Aktivitäten")}
            </h2>
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 2).map((a, i) => (
                <ActivityCard
                  key={a.id}
                  to={`/parent/myfamily/student/${a.childId}`}
                  avatar={a.avatar}
                  name={a.child}
                  text={a.text}
                  bg={i === 0 ? "bg-[#A7EEF0]" : "bg-[#F6CFE0]"}
                />
              ))}
            </div>
          </section>

          {/* My Family */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-4">
              {t("parent.home.myFamily", "Meine Familie")}
            </h2>
            <div className="flex items-start justify-center gap-8">
              {CHILDREN.map((c) => (
                <ChildBubble key={c.id} to={`/parent/myfamily/student/${c.id}`} avatar={c.avatar} name={c.name} meta={c.meta} />
              ))}
            </div>
            <hr className="mt-6 border-0 h-px bg-neutral-300/60" />
          </section>

          {/* News & Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">
              {t("parent.home.newsInsights", "Neuigkeiten & Einblicke")}
            </h2>
            {NEWS.map((n) => (
              <ParentNewsCard
                key={n.id}
                to="/parent/communications/news"
                badge={n.tag}
                title={n.title}
                excerpt={n.desc}
                image={n.image}
              />
            ))}
          </section>
        </section>
      </div>
    </ParentShell>
  );
}
