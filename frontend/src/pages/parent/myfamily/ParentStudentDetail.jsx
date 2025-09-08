// src/pages/parent/myfamily/ParentStudentDetail.jsx
import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import { StarFilled, FileTextOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Checkbox, Avatar, Tag, List, Typography } from "antd";
import { DUMMY_STUDENTS } from "./AddStudentModal";
import { formatDayLabel } from "@/utils/dateFormat";
import { useTranslation } from "react-i18next";
import BottomTabBar from "@/components/parent/BottomTabBar";

/* Local assets (background + avatars) */
import globalBg from "@/assets/backgrounds/global-bg.png";
import childOne from "@/assets/parent/childone.png";
import childTwo from "@/assets/parent/childtwo.png";

const { Text } = Typography;

/* ---------- Progress bars ---------- */
function Bars({ data, labels }) {
  const { t } = useTranslation();
  const cols = data?.length || 14;

  return (
    <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
      <div className="text-neutral-700 font-bold mb-2">
        {t("parent.student.progress.title")}
      </div>

      {/* Bars row */}
      <div
        className="h-36 grid items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {data.map((b, i) => {
          const barBase =
            "w-4 md:w-5 rounded-md shadow-sm border transition-colors duration-200";
          const color =
            b.highlight === "orange"
              ? "bg-orange-500 border-orange-500"
              : b.highlight === "pink"
              ? "bg-rose-400 border-rose-400"
              : "bg-white border-black/10";
          return (
            <div key={i} className="flex items-end justify-center">
              <div
                className={`${barBase} ${color}`}
                style={{ height: `${Math.max(8, Math.min(100, b.value))}%` }}
                aria-label={`Day ${i + 1} value ${b.value}`}
              />
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {labels.map((lbl, i) => {
          const [dow, day] = String(lbl).split(/\s+/); // e.g., "Mo." "10"
          return (
            <div key={i} className="text-center leading-tight">
              <div className="text-[11px] sm:text-[12px] text-neutral-600 whitespace-nowrap">
                {dow || ""}
              </div>
              <div className="text-[11px] sm:text-[12px] text-neutral-500 whitespace-nowrap">
                {day || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ParentStudentDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // ------- dummy student (from modal list) -------
  const selected =
    DUMMY_STUDENTS.find((s) => String(s.student_id) === String(id)) || {
      first_name: "",
      last_name: "",
      email: "",
      student_id: id,
      status: "Active",
    };

  // Choose avatar based on :id (1 -> childOne, 2 -> childTwo, else fallback)
  const avatarSrc =
    String(id) === "1" ? childOne : String(id) === "2" ? childTwo : childOne;

  const child = {
    id,
    name:
      (`${selected.first_name} ${selected.last_name}`.trim()) ||
      t("parent.student.defaultName"),
    age: t("parent.student.defaultAge"),
    avatar: avatarSrc,
    planStatus: t("parent.student.plan.active"),
    planName: t("parent.student.plan.premiumMonthly"),
    lessonsCompleted: 25,
    timeSpent: "12h 30m",
    status: t("parent.student.status.active"),
  };

  // ------- dummy bars + labels -------
  const bars = useMemo(() => {
    const base = [48, 30, 78, 72, 28, 22, 61, 84, 95, 38, 59, 70, 46, 60];
    return base.map((v, i) => ({
      value: v,
      highlight: i === 8 ? "orange" : i === 9 ? "pink" : null, // 2 highlighted days
    }));
  }, []);

  const dayLabels = useMemo(() => {
    const today = new Date();
    const lang = i18n?.language || "en";
    return Array.from({ length: 14 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - idx));
      return formatDayLabel(d, lang); // use active language (de/en/…)
    });
  }, [i18n?.language]);

  // ------- Activities & Recent Scans (per spec: show per child) -------
  const ACTIVITIES = [
    {
      id: 1,
      type: "activity",
      tag: "Math",
      text: "Completed a math lesson for homework",
      when: "Today 14:20",
    },
    {
      id: 2,
      type: "activity",
      tag: "Reading",
      text: "Started a reading exercise",
      when: "Yesterday 17:05",
    },
    {
      id: 3,
      type: "activity",
      tag: "Science",
      text: "Viewed Science resource",
      when: "Mon 10:11",
    },
  ];

  const RECENT_SCANS = [
    { id: "s-101", title: "Math Worksheet 4", when: "Today 13:55", status: "Processed" },
    { id: "s-099", title: "Reading Log Pg 2", when: "Yesterday 18:10", status: "Processed" },
  ];

  return (
    <GradientShell backgroundImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        {/* Single mobile layout on ALL sizes; leave space for footer */}
        <section className="relative w-full max-w-[520px] px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] mx-auto space-y-6">
          {/* Back arrow + title */}
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="!p-0 !h-auto text-neutral-700"
              aria-label="Back"
            />
            <h1 className="text-2xl font-extrabold text-neutral-800">
              {t("parent.student.title")}
            </h1>
          </div>

          {/* identity */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/60 shadow">
              <img
                src={child.avatar}
                alt={child.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xl font-extrabold text-neutral-800">
                {child.name}
              </div>
              <div className="text-neutral-600">{child.age}</div>
            </div>
          </div>

          {/* plan */}
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
              {t("parent.student.plan.current")}
            </h2>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-500 grid place-items-center">
                    <StarFilled />
                  </div>
                  <div>
                    <div className="text-rose-500 font-bold leading-tight">
                      {child.planStatus}
                    </div>
                    <div className="text-neutral-600 text-[13px]">
                      {child.planName}
                    </div>
                  </div>
                </div>
              </div>
              <Button className="shrink-0" type="primary">
                {t("parent.student.plan.changeToYearly")}
              </Button>
            </div>
          </div>

          {/* stats */}
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">
              {t("parent.student.activity.title")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#F2787E] text-white">
                <div className="text-[15px] font-semibold opacity-90 mb-1">
                  {t("parent.student.activity.lessonsCompleted")}
                </div>
                <div className="text-5xl font-extrabold tracking-tight leading-none">
                  {child.lessonsCompleted}
                </div>
              </div>
              <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#11C0C6] text-white">
                <div className="text-[15px] font-semibold opacity-90 mb-1">
                  {t("parent.student.activity.timeSpent")}
                </div>
                <div className="text-5xl font-extrabold tracking-tight leading-none">
                  {child.timeSpent}
                </div>
              </div>
            </div>
          </div>

          {/* progress */}
          <Bars data={bars} labels={dayLabels} />

          {/* Activities + Recent Scans */}
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">
              {t("parent.student.activities")}
            </h2>

            {/* Activity list */}
            <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-2 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
              <List
                itemLayout="horizontal"
                dataSource={ACTIVITIES}
                renderItem={(a) => (
                  <List.Item className="!px-2" key={a.id}>
                    <div className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50">
                      <List.Item.Meta
                        avatar={<Avatar src={child.avatar} />}
                        title={
                          <div className="flex items-center gap-2">
                            <Text strong>{a.text}</Text>
                            <Tag color="blue">{a.tag}</Tag>
                          </div>
                        }
                        description={<Text type="secondary">{a.when}</Text>}
                      />
                    </div>
                  </List.Item>
                )}
              />
            </div>

            {/* Recent Scans */}
            <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-2 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
              <div className="px-3 py-2 font-bold text-neutral-800">
                {t("parent.student.recentScans")}
              </div>
              <List
                dataSource={RECENT_SCANS}
                renderItem={(s) => (
                  <List.Item className="!px-2" key={s.id}>
                    <Link
                      to={`/parent/myfamily/student/${child.id}/scans/${s.id}`}
                      className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileTextOutlined className="text-gray-500" />
                          <span className="font-semibold text-neutral-800">
                            {s.title}
                          </span>
                          <Tag color="green">{s.status}</Tag>
                        </div>
                        <Text type="secondary">{s.when}</Text>
                      </div>
                    </Link>
                  </List.Item>
                )}
              />
            </div>

            {/* Focus topics */}
            <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
              <div className="text-neutral-800 font-bold mb-2">
                {t("parent.student.focusTopics")}
              </div>
              <div className="text-neutral-700 mb-3">
                {t("parent.student.focusTopicsChooseTwo", {
                  defaultValue: "Choose two focus areas:",
                })}
              </div>
              <div className="grid gap-2">
                <Checkbox defaultChecked>Math</Checkbox>
                <Checkbox defaultChecked>German</Checkbox>
                <Checkbox>Nature & Environment</Checkbox>
                <Checkbox>Concentration</Checkbox>
              </div>
            </div>
          </div>

          {/* Footer tab bar INSIDE the mockup */}
          <div className="sticky bottom-0 left-0 right-0 -mx-4">
            <BottomTabBar />
          </div>
        </section>
      </div>
    </GradientShell>
  );
}
