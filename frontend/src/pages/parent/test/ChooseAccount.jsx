// src/pages/ChooseAccount.jsx
import { useCallback } from "react";
import { Avatar, Card } from "antd";
import { useNavigate } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";

// Single row card
function Row({ name, sub, avatar, onClick }) {
  // Show initial if no avatar
  const initial = !avatar && name ? name.charAt(0).toUpperCase() : null;

  return (
    <Card
      hoverable
      className="mb-4 cursor-pointer rounded-2xl shadow hover:shadow-lg focus:outline-none"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      bodyStyle={{ padding: 16 }}
    >
      <div className="flex items-center gap-4">
        <Avatar size={56} src={avatar} className="bg-indigo-50 text-indigo-700">
          {initial}
        </Avatar>
        <div>
          <div className="text-lg font-semibold">{name}</div>
          {sub ? <div className="text-neutral-500">{sub}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export default function ChooseAccount() {
  const navigate = useNavigate();

  // 🔧 Adjust routes to match your app
  const accounts = [
    { name: "Student A", sub: "Grade 3", to: "/student/dashboard", avatar: "" },
    { name: "Student B", sub: "Grade 1", to: "/student/dashboard", avatar: "" },
    { name: "Parent", sub: "", to: "/parent/dashboard", avatar: "" },
  ];

  const go = useCallback((to) => () => navigate(to), [navigate]);

  return (
    <GradientShell>
      <TopBar title="Choose Account" />

      <div className="mt-2 px-5">
        <p className="text-neutral-100/90">Who’s logging in?</p>

        <div className="mt-3">
          {accounts.map((a, idx) => (
            <Row
              key={idx}
              name={a.name}
              sub={a.sub}
              avatar={a.avatar}
              onClick={go(a.to)}
            />
          ))}
        </div>
      </div>
    </GradientShell>
  );
}
