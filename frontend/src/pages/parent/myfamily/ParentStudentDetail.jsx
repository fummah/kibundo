// src/pages/parent/myfamily/ParentStudentDetail.jsx
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import {
  StarFilled,
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Card, Row, Col, Statistic, Button, Checkbox, Avatar, Tag } from "antd";
import { DUMMY_STUDENTS } from "./AddStudentModal";
import { formatDayLabel } from "@/utils/dateFormat";

/* ---------- Bottom tabs (mobile) ---------- */
function BottomTabBar() {
  const base =
    "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs">
      <div className="mx-auto max-w-[720px] px-2 flex">
        <Link to="/parent" className={`${base} ${item}`}>
          <HomeOutlined className="text-xl" />
          <span>Home</span>
        </Link>
        <Link to="/parent/myfamily/family?add=1" className={`${base} ${item}`}>
          <PlusCircleOutlined className="text-xl" />
          <span>Add Child</span>
        </Link>
        <Link to="/parent/communications/news" className={`${base} ${item}`}>
          <ReadOutlined className="text-xl" />
          <span>News</span>
        </Link>
        <Link to="/parent/helpdesk/tasks" className={`${base} ${item}`}>
          <MessageOutlined className="text-xl" />
          <span>Feedback</span>
        </Link>
        <Link to="/parent/settings" className={`${base} ${item}`}>
          <SettingOutlined className="text-xl" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}

/* ---------- Progress bars (matches the mock layout) ---------- */
function Bars({ data, labels }) {
  const cols = data?.length || 14;

  return (
    <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
      <div className="text-neutral-700 font-bold mb-2">14 Days Progress</div>

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

      {/* Labels row: 2 lines, no wrapping */}
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {labels.map((lbl, i) => {
          const [dow, day] = String(lbl).split(/\s+/); // "Mo." "10"
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

  // ------- dummy student (from modal list) -------
  const selected =
    DUMMY_STUDENTS.find((s) => String(s.student_id) === String(id)) || {
      first_name: "Name",
      last_name: "Child one",
      email: "",
      student_id: id,
      status: "Active",
    };

  const child = {
    name: `${selected.first_name} ${selected.last_name}`.trim(),
    age: "Age X",
    avatar: "https://i.pravatar.cc/120?img=5",
    planStatus: "Active",
    planName: "Premium Plan (monthly)",
    lessonsCompleted: 25,
    timeSpent: "12h 30m",
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
    return Array.from({ length: 14 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - idx));
      return formatDayLabel(d, "de"); // e.g., "Mo. 10"
    });
  }, []);

  return (
    <GradientShell>
      <div className="mx-auto w-full max-w-[1200px] pt-4 pb-28 md:pb-10">
        {/* ---------- MOBILE ---------- */}
        <section className="mobile-only">
          {/* top heading */}
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-3xl font-extrabold text-neutral-800">
              Student Details
            </h1>
          </div>

          {/* identity */}
          <div className="flex items-center gap-4 mb-5">
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
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
              Actual Plan
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
              <button
                className="shrink-0 h-10 px-4 rounded-full bg-lime-300/90 hover:bg-lime-400 text-neutral-800 font-semibold border border-lime-400 transition shadow"
                type="button"
              >
                Change to yearly
              </button>
            </div>
          </div>

          {/* stats */}
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">
              Activity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#F2787E] text-white">
                <div className="text-[15px] font-semibold opacity-90 mb-1">
                  Lessons Completed
                </div>
                <div className="text-5xl font-extrabold tracking-tight leading-none">
                  {child.lessonsCompleted}
                </div>
              </div>
              <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#11C0C6] text-white">
                <div className="text-[15px] font-semibold opacity-90 mb-1">
                  Time Spent Learning
                </div>
                <div className="text-5xl font-extrabold tracking-tight leading-none">
                  {child.timeSpent}
                </div>
              </div>
            </div>
          </div>

          {/* progress */}
          <div className="mb-8">
            <Bars data={bars} labels={dayLabels} />
          </div>

          {/* focus topics */}
          <div className="mb-24">
            <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
              Focus Topics
            </h2>
            <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
              <div className="text-neutral-700 mb-3">Choose two focus areas:</div>
              <ul className="space-y-3">
                {[
                  { label: "Math", checked: true },
                  { label: "German", checked: true },
                  { label: "Nature & Environment", checked: false },
                  { label: "Concentration", checked: false },
                ].map((opt) => (
                  <li key={opt.label} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      readOnly
                      className="h-5 w-5 rounded-md accent-lime-600 border border-lime-400"
                    />
                    <span className="text-neutral-800">{opt.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <BottomTabBar />
        </section>

        {/* ---------- DESKTOP ---------- */}
        <section className="desktop-only">
          {/* page heading */}
          <h1 className="text-2xl md:text-3xl font-extrabold mb-3">
            Student Details
          </h1>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card className="shadow-sm rounded-2xl">
                <div className="flex items-center gap-4">
                  <Avatar size={64} src={child.avatar} />
                  <div className="flex-1">
                    <div className="text-2xl font-extrabold">{child.name}</div>
                    <div className="text-gray-500">{child.age}</div>
                  </div>
                  <Tag color="green" className="text-base">
                    {selected.status || "Active"}
                  </Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="shadow-sm rounded-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-500 grid place-items-center">
                      <StarFilled />
                    </div>
                    <div>
                      <div className="text-rose-500 font-bold">{child.planStatus}</div>
                      <div className="text-neutral-600">{child.planName}</div>
                    </div>
                  </div>
                  <Button type="primary">Change to yearly</Button>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-2">
            <Col xs={24} md={12}>
              <Card className="shadow-sm rounded-2xl bg-[#F2787E] text-white">
                <Statistic
                  title={<span className="text-white/90">Lessons Completed</span>}
                  value={child.lessonsCompleted}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="shadow-sm rounded-2xl bg-[#11C0C6] text-white">
                <Statistic
                  title={<span className="text-white/90">Time Spent Learning</span>}
                  value={child.timeSpent}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-2">
            <Col xs={24} md={16}>
              <Card className="shadow-sm rounded-2xl">
                <Bars data={bars} labels={dayLabels} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Focus Topics" className="shadow-sm rounded-2xl">
                <div className="text-neutral-700 mb-2">Choose two focus areas:</div>
                <div className="grid gap-2">
                  <Checkbox defaultChecked>Math</Checkbox>
                  <Checkbox defaultChecked>German</Checkbox>
                  <Checkbox>Nature & Environment</Checkbox>
                  <Checkbox>Concentration</Checkbox>
                </div>
              </Card>
            </Col>
          </Row>
        </section>
      </div>
    </GradientShell>
  );
}
