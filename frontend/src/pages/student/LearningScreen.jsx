// src/pages/student/LearningScreen.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import CardTile from "@/components/student/common/CardTile.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";

const SUBJECTS = [
  {
    key: "math",
    title: "Math",
    img: "https://images.unsplash.com/photo-1517971071642-34a2d3ecc9cd?q=80&w=800&auto=format&fit=crop",
    to: "/student/learning/subject/math",
  },
  {
    key: "science",
    title: "Science",
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop",
    to: "/student/learning/subject/science",
  },
  {
    key: "tech",
    title: "Technology & Programming",
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    to: "/student/learning/subject/technology",
  },
  {
    key: "german",
    title: "German Language",
    img: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=800&auto=format&fit=crop",
    to: "/student/learning/subject/german",
  },
];

export default function LearningScreen() {
  const navigate = useNavigate();

  // contexts for name + avatar (same pattern as ReadingScreen)
  const { state } = useStudentApp();
  const { user } = useAuthContext();

  const buddy = state?.buddy;
  const name = useMemo(() => {
    const fromProfile = state?.profile?.name;
    const fromUser =
      user?.first_name ||
      user?.name ||
      (user?.email ? user.email.split("@")[0] : null);
    return fromProfile || fromUser || "Student";
  }, [state?.profile?.name, user]);

  return (
    // Scrollable in all views and safe with chat footer
    <div className="relative px-3 md:px-6 py-4 mx-auto w-full max-w-5xl min-h-[100svh] md:min-h-0 md:h-full lg:h-full overflow-y-auto">
      {/* Header: Back + Greeting */}
      <div className="flex items-center gap-3 pt-6 mb-4">
        <BackButton className="p-2 rounded-full hover:bg-neutral-100 active:scale-95" />
        <div className="flex-1">
          <GreetingBanner
            avatarSrc={buddy?.avatar}
            title="Learning"
            subtitle={`Hello, ${name}! What would you like to learn today?`}
            className="!bg-white"
            translucent={false}
          />
        </div>
      </div>

      {/* Subjects grid (responsive) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {SUBJECTS.map((s) => (
          <CardTile
            key={s.key}
            img={s.img}
            title={s.title}
            onClick={() => navigate(s.to)}
          />
        ))}
      </div>

      {/* Keep content above chat footer */}
      <ChatStripSpacer />
    </div>
  );
}
