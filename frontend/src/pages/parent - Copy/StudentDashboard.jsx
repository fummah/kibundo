// src/pages/parent/StudentDashboard.jsx
import { useMemo, useState } from "react";
import { Card, Avatar, Button, Tag, Checkbox, Typography, Space, message } from "antd";
import { StarFilled } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import GlobalLayout from "@/components/layouts/GlobalLayout";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Rectangle,
} from "recharts";

const { Title, Text } = Typography;

/* ---------------- Mock Data (replace with API later) ---------------- */
const child = {
  name: "Name Child one",
  age: "Age X",
  avatar: "/assets/child-boy.png",
};

const plan = { status: "Active", label: "Premium Plan monatlich" };

const kpis = {
  lessonsCompleted: 25,
  timeSpent: "12h 30m",
};

const progress = [
  { day: "Mo. 10", value: 7 },
  { day: "Di. 11", value: 5 },
  { day: "Mi. 12", value: 9 },
  { day: "Do. 13", value: 9 },
  { day: "Fr. 14", value: 4 },
  { day: "Sa. 15", value: 0 },
  { day: "So. 16", value: 6 },
  { day: "Mo. 17", value: 12, highlight: "orange" },
  { day: "Di. 18", value: 13, highlight: "pink" },
  { day: "Mi. 19", value: 6 },
  { day: "Do. 20", value: 10 },
  { day: "Fr. 21", value: 7 },
  { day: "Sa. 22", value: 8 },
  { day: "So. 23", value: 9 },
];

const TOPIC_OPTIONS = [
  { label: "Mathe", value: "math" },
  { label: "Deutsch", value: "german" },
  { label: "Natur und Umwelt", value: "nature" },
  { label: "Konzentration", value: "focus" },
];

/* ---------------- UI Helpers ---------------- */
function KpiCard({ title, value, bg = "#ef476f" }) {
  return (
    <Card
      className="rounded-2xl border-0 shadow"
      styles={{ body: { padding: 18, background: bg, color: "white", borderRadius: 16 } }}
    >
      <div className="text-[13px] font-semibold opacity-90">{title}</div>
      <div className="text-[32px] leading-none font-extrabold mt-1">{value}</div>
    </Card>
  );
}

function ProgressChartBox() {
  return (
    <Card className="rounded-2xl border-0 shadow" styles={{ body: { padding: 16 } }}>
      <div className="text-[14px] font-semibold text-[#6e5e4e] mb-2">14 Days Progress</div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={progress} barSize={18}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#7a7066" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={36}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ borderRadius: 12 }}
              formatter={(v) => [`${v} pts`, "Score"]}
              labelStyle={{ color: "#6e5e4e" }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              shape={(props) => {
                const { fill, x, y, width, height, payload } = props;
                const color =
                  payload.highlight === "orange"
                    ? "#ff914d"
                    : payload.highlight === "pink"
                    ? "#ff6b6b"
                    : "#ffffff";
                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    radius={[6, 6, 0, 0]}
                    fill={color}
                    stroke="#e6e0d9"
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function FocusTopicsBox() {
  const [selected, setSelected] = useState(["math", "german"]);

  const onChange = (vals) => {
    if (vals.length > 2) {
      message.warning("Bitte wähle höchstens zwei Schwerpunkte.");
      return; // block extra selection
    }
    setSelected(vals);
  };

  const options = useMemo(
    () =>
      TOPIC_OPTIONS.map((o) => ({
        ...o,
        disabled: selected.length >= 2 && !selected.includes(o.value),
      })),
    [selected]
  );

  return (
    <Card className="rounded-2xl border-0 shadow" styles={{ body: { padding: 16 } }}>
      <div className="text-[16px] font-extrabold text-[#6e5e4e] mb-3">Fokusthemen</div>
      <div className="text-[13px] text-[#6e5e4e] mb-2">
        Wähle zwei Schwerpunkte aus:
      </div>
      <Checkbox.Group
        className="grid grid-cols-1 gap-2"
        value={selected}
        options={options}
        onChange={onChange}
      />
    </Card>
  );
}

/* ---------------- MOBILE SECTION ---------------- */
function MobileView() {
  return (
    <div className="mobile-only">
      <GradientShell pad={false}>
        <TopBar title="Dashboard" showBack />
        <div className="px-5">
          {/* Header */}
          <section className="mt-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar src={child.avatar} size={56} className="bg-[#f3eee7]" />
              <div>
                <div className="text-[18px] font-extrabold text-[#544536]">{child.name}</div>
                <div className="text-[12px] text-[#8a7f73]">{child.age}</div>
              </div>
            </div>
          </section>

          {/* Actual Plan */}
          <section className="mb-4">
            <Card className="rounded-2xl border-0 shadow" styles={{ body: { padding: 16 } }}>
              <div className="flex items-center justify-between">
                <Space size={8} align="center">
                  <Tag color="#ffd6e7" className="px-2 py-[2px] rounded-full">
                    <span className="text-[#d4380d] font-semibold flex items-center gap-1">
                      <StarFilled /> {plan.status}
                    </span>
                  </Tag>
                  <span className="text-[#8a7f73]">{plan.label}</span>
                </Space>
                <Button
                  size="small"
                  className="rounded-full bg-[#d0e05c] border-none text-[#5a5a2a] font-semibold"
                >
                  Change to yearly
                </Button>
              </div>
            </Card>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-1 gap-3">
            <KpiCard title="Lessons Completed" value={kpis.lessonsCompleted} bg="#f26d6d" />
            <KpiCard title="Time Spent Learning" value={kpis.timeSpent} bg="#12b6bd" />
          </section>

          {/* Progress */}
          <section className="mt-4">
            <ProgressChartBox />
          </section>

          {/* Focus Topics */}
          <section className="mt-4 pb-28">
            <FocusTopicsBox />
          </section>
        </div>

        <BottomNav />
      </GradientShell>
    </div>
  );
}

/* ---------------- DESKTOP SECTION ---------------- */
function DesktopView() {
  return (
    <div className="desktop-only">
      <GlobalLayout>
        <div className="mx-auto w-full max-w-4xl p-6">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#6e5e4e] text-center mb-6">
            Dashboard
          </h1>

          {/* Header */}
          <section className="mb-4">
            <div className="flex items-center gap-4">
              <Avatar src={child.avatar} size={72} className="bg-[#f3eee7]" />
              <div>
                <div className="text-[22px] font-extrabold text-[#544536]">{child.name}</div>
                <div className="text-[13px] text-[#8a7f73]">{child.age}</div>
              </div>
            </div>
          </section>

          {/* Plan */}
          <section className="mb-6">
            <Card className="rounded-2xl border-0 shadow" styles={{ body: { padding: 20 } }}>
              <div className="flex items-center justify-between">
                <Space size={10} align="center">
                  <Tag color="#ffd6e7" className="px-3 py-[4px] rounded-full">
                    <span className="text-[#d4380d] font-semibold flex items-center gap-1">
                      <StarFilled /> {plan.status}
                    </span>
                  </Tag>
                  <span className="text-[#8a7f73]">{plan.label}</span>
                </Space>
                <Button
                  className="rounded-full bg-[#d0e05c] border-none text-[#5a5a2a] font-semibold"
                >
                  Change to yearly
                </Button>
              </div>
            </Card>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-2 gap-4">
            <KpiCard title="Lessons Completed" value={kpis.lessonsCompleted} bg="#f26d6d" />
            <KpiCard title="Time Spent Learning" value={kpis.timeSpent} bg="#12b6bd" />
          </section>

          {/* Progress */}
          <section className="mt-6">
            <ProgressChartBox />
          </section>

          {/* Focus Topics */}
          <section className="mt-6 mb-8">
            <FocusTopicsBox />
          </section>
        </div>
      </GlobalLayout>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  );
}
