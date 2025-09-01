import { Link } from "react-router-dom";
import {
  StarFilled,
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Checkbox,
  Avatar,
  Tag,
  List,
  Typography,
} from "antd";
import React from "react";

const { Text } = Typography;

/* ---------------- Internal: Bottom tabs (mobile) ---------------- */
function BottomTabBar({ routes }) {
  const base = "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs">
      <div className="mx-auto max-w-[720px] px-2 flex">
        <Link to={routes.home} className={`${base} ${item}`}>
          <HomeOutlined className="text-xl" />
          <span>Home</span>
        </Link>
        <Link to={routes.addChild} className={`${base} ${item}`}>
          <PlusCircleOutlined className="text-xl" />
          <span>Add Child</span>
        </Link>
        <Link to={routes.news} className={`${base} ${item}`}>
          <ReadOutlined className="text-xl" />
          <span>News</span>
        </Link>
        <Link to={routes.tickets} className={`${base} ${item}`}>
          <MessageOutlined className="text-xl" />
          <span>Feedback</span>
        </Link>
        <Link to={routes.settings} className={`${base} ${item}`}>
          <SettingOutlined className="text-xl" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}

/* ---------------- Internal: Progress bars ---------------- */
function Bars({ values = [], labels = [] }) {
  const cols = values?.length || 14;
  return (
    <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
      <div className="text-neutral-700 font-bold mb-2">14 Days Progress</div>
      <div className="h-36 grid items-end gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {values.map((b, i) => {
          const color =
            b.highlight === "orange" ? "bg-orange-500 border-orange-500"
            : b.highlight === "pink" ? "bg-rose-400 border-rose-400"
            : "bg-white border-black/10";
          return (
            <div key={i} className="flex items-end justify-center">
              <div
                className={`w-4 md:w-5 rounded-md shadow-sm border transition-colors duration-200 ${color}`}
                style={{ height: `${Math.max(8, Math.min(100, b.value || 0))}%` }}
                aria-label={`Day ${i + 1} value ${b.value || 0}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {labels.map((lbl, i) => {
          const [dow, day] = String(lbl).split(/\s+/);
          return (
            <div key={i} className="text-center leading-tight">
              <div className="text-[11px] sm:text-[12px] text-neutral-600 whitespace-nowrap">{dow || ""}</div>
              <div className="text-[11px] sm:text-[12px] text-neutral-500 whitespace-nowrap">{day || ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   StudentDetail (default)
   ========================= */
export default function StudentDetail({
  student,
  activities = [],
  recentScans = [],
  progress = { values: [], labels: [] },
  routes = {
    home: "/parent",
    addChild: "/parent/myfamily/family?add=1",
    news: "/parent/communications/news",
    tickets: "/parent/helpdesk/tickets", // Feedback points to Tickets (Tasks hidden)
    settings: "/parent/settings",
    studentBase: (id) => `/parent/myfamily/student/${id}`,
    scanDetail: (id, scanId) => `/parent/myfamily/student/${id}/scans/${scanId}`,
  },
  showBottomTabs = true,
  onChangePlan, // optional handler for "Change to yearly"
}) {
  const child = {
    id: student?.id,
    name: student?.name || "Child Name",
    age: student?.age || "Age X",
    avatar: student?.avatar || "https://i.pravatar.cc/120?img=5",
    planStatus: student?.planStatus || "Active",
    planName: student?.planName || "Premium Plan (monthly)",
    lessonsCompleted: student?.lessonsCompleted ?? 0,
    timeSpent: student?.timeSpent || "0h 00m",
    status: student?.status || "Active",
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] pt-4 pb-28 md:pb-10">
      {/* ---------- MOBILE ---------- */}
      <section className="mobile-only">
        <div className="flex items-center justify-center mb-3">
          <h1 className="text-3xl font-extrabold text-neutral-800">Child Details</h1>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/60 shadow">
            <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-neutral-800">{child.name}</div>
            <div className="text-neutral-600">{child.age}</div>
          </div>
        </div>

        {/* Plan */}
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-neutral-800 mb-2">Current Plan</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-500 grid place-items-center">
                  <StarFilled />
                </div>
                <div>
                  <div className="text-rose-500 font-bold leading-tight">{child.planStatus}</div>
                  <div className="text-neutral-600 text-[13px]">{child.planName}</div>
                </div>
              </div>
            </div>
            <button
              className="shrink-0 h-10 px-4 rounded-full bg-lime-300/90 hover:bg-lime-400 text-neutral-800 font-semibold border border-lime-400 transition shadow"
              type="button"
              onClick={onChangePlan}
            >
              Change to yearly
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-neutral-800 mb-3">Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#F2787E] text-white">
              <div className="text-[15px] font-semibold opacity-90 mb-1">Lessons Completed</div>
              <div className="text-5xl font-extrabold tracking-tight leading-none">{child.lessonsCompleted}</div>
            </div>
            <div className="rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70 bg-[#11C0C6] text-white">
              <div className="text-[15px] font-semibold opacity-90 mb-1">Time Spent Learning</div>
              <div className="text-5xl font-extrabold tracking-tight leading-none">{child.timeSpent}</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Bars values={progress.values} labels={progress.labels} />
        </div>

        {/* Activities + Recent Scans */}
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-extrabold text-neutral-800">Activities</h2>

          {/* Activities list */}
          <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-2 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
            <List
              itemLayout="horizontal"
              dataSource={activities}
              renderItem={(a) => (
                <List.Item key={a.id} className="!px-2">
                  <div className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50">
                    <List.Item.Meta
                      avatar={<Avatar src={child.avatar} />}
                      title={
                        <div className="flex items-center gap-2">
                          <Text strong>{a.text}</Text>
                          {a.tag ? <Tag color="blue">{a.tag}</Tag> : null}
                        </div>
                      }
                      description={<Text type="secondary">{a.when}</Text>}
                    />
                  </div>
                </List.Item>
              )}
            />
          </div>

          {/* Recent Scans (clickable) */}
          <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-2 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
            <div className="px-3 py-2 font-bold text-neutral-800">Recent Scans</div>
            <List
              dataSource={recentScans}
              renderItem={(s) => (
                <List.Item key={s.id} className="!px-2">
                  <Link
                    to={routes.scanDetail(child.id, s.id)}
                    className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileTextOutlined className="text-gray-500" />
                        <span className="font-semibold text-neutral-800">{s.title}</span>
                        {s.status ? <Tag color="green">{s.status}</Tag> : null}
                      </div>
                      <Text type="secondary">{s.when}</Text>
                    </div>
                  </Link>
                </List.Item>
              )}
            />
          </div>
        </div>

        {/* Focus topics */}
        <div className="mb-24">
          <h2 className="text-xl font-extrabold text-neutral-800 mb-2">Focus Topics</h2>
          <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
            <div className="text-neutral-700 mb-2">Choose two focus areas:</div>
            <div className="grid gap-2">
              <Checkbox defaultChecked>Math</Checkbox>
              <Checkbox defaultChecked>German</Checkbox>
              <Checkbox>Nature & Environment</Checkbox>
              <Checkbox>Concentration</Checkbox>
            </div>
          </div>
        </div>

        {showBottomTabs && <BottomTabBar routes={routes} />}
      </section>

      {/* ---------- DESKTOP ---------- */}
      <section className="desktop-only">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-3">Child Details</h1>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card className="shadow-sm rounded-2xl">
              <div className="flex items-center gap-4">
                <Avatar size={64} src={child.avatar} />
                <div className="flex-1">
                  <div className="text-2xl font-extrabold">{child.name}</div>
                  <div className="text-gray-500">{child.age}</div>
                </div>
                <Tag color="green" className="text-base">{child.status}</Tag>
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
                <Button type="primary" onClick={onChangePlan}>Change to yearly</Button>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24} md={12}>
            <Card className="shadow-sm rounded-2xl bg-[#F2787E] text-white">
              <Statistic title={<span className="text-white/90">Lessons Completed</span>} value={child.lessonsCompleted} />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="shadow-sm rounded-2xl bg-[#11C0C6] text-white">
              <Statistic title={<span className="text-white/90">Time Spent Learning</span>} value={child.timeSpent} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24} md={16}>
            <Card className="shadow-sm rounded-2xl">
              <Bars values={progress.values} labels={progress.labels} />
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

        {/* Activities + Recent Scans */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24} md={16}>
            <Card title="Activities" className="shadow-sm rounded-2xl">
              <List
                itemLayout="horizontal"
                dataSource={activities}
                renderItem={(a) => (
                  <List.Item key={a.id} className="!px-0">
                    <div className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50">
                      <List.Item.Meta
                        avatar={<Avatar src={child.avatar} />}
                        title={
                          <div className="flex items-center gap-2">
                            <Text strong>{a.text}</Text>
                            {a.tag ? <Tag color="blue">{a.tag}</Tag> : null}
                          </div>
                        }
                        description={<Text type="secondary">{a.when}</Text>}
                      />
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Recent Scans" className="shadow-sm rounded-2xl">
              <List
                dataSource={recentScans}
                renderItem={(s) => (
                  <List.Item key={s.id} className="!px-0">
                    <Link
                      to={routes.scanDetail(child.id, s.id)}
                      className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileTextOutlined className="text-gray-500" />
                          <span className="font-semibold text-neutral-800">{s.title}</span>
                          {s.status ? <Tag color="green">{s.status}</Tag> : null}
                        </div>
                        <Text type="secondary">{s.when}</Text>
                      </div>
                    </Link>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </section>
    </div>
  );
}
