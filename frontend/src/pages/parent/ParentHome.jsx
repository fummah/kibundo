// src/pages/parent/ParentHome.jsx
import { Link } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  MessageOutlined,
  SettingOutlined,
  FileSearchOutlined,
  BookOutlined,
  FileDoneOutlined,
  BellOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Typography,
  Button,
  Avatar,
  Space,
} from "antd";

const { Title, Text } = Typography;

/* ---------------- Dummy content (shared by mobile & desktop) ---------------- */
const avatar1 = "https://i.pravatar.cc/120?img=5";
const avatar2 = "https://i.pravatar.cc/120?img=12";

const CHILDREN = [
  { id: 1, name: "Name Child one", meta: "Age X, Grade 3", avatar: avatar1 },
  { id: 2, name: "Name Child two", meta: "Age X, Grade 1", avatar: avatar2 },
];

const ACTIVITIES = [
  { id: 1, child: "Name Child one", text: "Completed a math lesson for homework", when: "Today 14:20", tag: "Math", avatar: avatar1 },
  { id: 2, child: "Name Child two", text: "Started a reading exercise", when: "Yesterday 17:05", tag: "Reading", avatar: avatar2 },
  { id: 3, child: "Name Child one", text: "Viewed Science resource", when: "Mon 10:11", tag: "Science", avatar: avatar1 },
];

const NEWS = [
  {
    id: 1,
    tag: "Blog Post",
    title: "Tips for Encouraging Reading",
    desc: "Learn how to foster a love for reading in your child.",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 2,
    tag: "Platform update",
    title: "New Math Games Added",
    desc: "Explore the latest math games designed to make learning fun.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 3,
    tag: "Unknown Category",
    title: "Further Chapter Headline",
    desc: "Explore the latest math games designed to make learning fun.",
    image:
      "https://images.unsplash.com/photo-1503453363464-743ee9ce1584?q=80&w=600&auto=format&fit=crop",
  },
];

const NOTICES = [
  { id: 1, title: "Invoice #INV-104 due in 3 days", type: "warning" },
  { id: 2, title: "New newsletter: ‘Back-to-School Tips’", type: "info" },
];

/* ---------------- Small mobile components ---------------- */
function ActivityCard({ avatar, name, text, bg = "bg-cyan-200" }) {
  return (
    <div className={`w-full ${bg} rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/60`}>
      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full ring-4 ring-white/60 object-cover" />
        <div className="flex-1">
          <div className="font-extrabold text-neutral-800">{name}</div>
          <div className="text-neutral-700">{text}</div>
        </div>
      </div>
    </div>
  );
}
function ChildBubble({ avatar, name, meta }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-4 ring-white/60">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold text-neutral-800 leading-tight">{name}</div>
      <div className="text-xs text-neutral-500">{meta}</div>
    </div>
  );
}
function NewsCard({ tag, title, desc, image }) {
  return (
    <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70">
      <div className="flex gap-4 items-stretch">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-emerald-700 mb-1">{tag}</div>
          <div className="text-xl font-extrabold text-neutral-800 mb-2 leading-snug">{title}</div>
          <div className="text-neutral-600 text-[14px]">{desc}</div>
        </div>
        <div className="w-28 h-24 shrink-0 rounded-xl overflow-hidden ring-4 ring-white/60 self-center">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

function BottomTabBar() {
  const base = "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[12px] font-semibold";
  const item = "text-lime-900/90 hover:text-lime-950 transition-colors";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-lime-400/90 backdrop-blur border-t border-lime-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] bottom-tabs mobile-only">
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

/* ---------------- Page ---------------- */
export default function ParentHome() {
  const stats = [
    { title: "Active Children", value: CHILDREN.length, icon: <TeamOutlined /> },
    { title: "This Week Scans", value: 8, icon: <FileSearchOutlined /> },
    { title: "Resources Saved", value: 14, icon: <BookOutlined /> },
    { title: "Unpaid Invoices", value: 1, icon: <FileDoneOutlined /> },
  ];

  return (
    <GradientShell>
      <div className="mx-auto max-w-[1200px] pt-6 pb-28 md:pb-8 px-4 md:px-6">
        {/* ---------------- Mobile ---------------- */}
        <section className="mobile-only space-y-6">
          {/* Header WITHOUT the Add Student button */}
          <h1 className="text-2xl font-extrabold text-neutral-800">Welcome back 👋</h1>

          {/* Activities */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">Activities</h2>
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 2).map((a, i) => (
                <ActivityCard
                  key={a.id}
                  avatar={a.avatar}
                  name={a.child}
                  text={a.text}
                  bg={i === 0 ? "bg-[#A7EEF0]" : "bg-[#F6CFE0]"}
                />
              ))}
            </div>
          </section>

          {/* Children */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-4">Your Children</h2>
            <div className="flex items-start gap-8">
              {CHILDREN.map((c) => (
                <ChildBubble key={c.id} avatar={c.avatar} name={c.name} meta={c.meta} />
              ))}
            </div>
            <hr className="mt-6 border-0 h-px bg-neutral-300/60" />
          </section>

          {/* News & Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">News &amp; Insights</h2>
            {NEWS.map((n) => (
              <NewsCard key={n.id} {...n} />
            ))}
          </section>

          <BottomTabBar />
        </section>

        {/* ---------------- Desktop ---------------- */}
        <section className="desktop-only space-y-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <Title level={3} className="!mb-0">Parent Dashboard</Title>
              <Text type="secondary">Overview of your family’s learning and billing.</Text>
            </div>
            <Space>
              <Link to="/parent/learning/scans">
                <Button type="primary" icon={<FileSearchOutlined />}>Scan Homework</Button>
              </Link>
              <Link to="/parent/myfamily/family?add=1">
                <Button icon={<PlusCircleOutlined />}>Add Student</Button>
              </Link>
            </Space>
          </div>

          {/* Stats */}
          <Row gutter={[16, 16]}>
            {stats.map((s, i) => (
              <Col xs={12} md={6} key={i}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title={s.title} value={s.value} />
                    {s.icon && <span className="text-xl text-gray-500">{s.icon}</span>}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Two-column: Recent Activity + Notices */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Card title="Recent Activity" className="shadow-sm rounded-2xl">
                <List
                  itemLayout="horizontal"
                  dataSource={ACTIVITIES}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar src={item.avatar} />}
                        title={
                          <div className="flex items-center gap-2">
                            <Text strong>{item.child}</Text>
                            <Tag color="blue">{item.tag}</Tag>
                          </div>
                        }
                        description={
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span>{item.text}</span>
                            <Text type="secondary" className="sm:ml-4">{item.when}</Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title={
                  <span className="flex items-center">
                    <BellOutlined className="mr-2" /> Notices
                  </span>
                }
                className="shadow-sm rounded-2xl"
              >
                <List
                  dataSource={NOTICES}
                  renderItem={(n) => (
                    <List.Item>
                      <Text type={n.type === "warning" ? "danger" : "secondary"}>{n.title}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          {/* Children */}
          <Card title="Your Children" className="shadow-sm rounded-2xl">
            <Space size="large" wrap>
              {CHILDREN.map((c) => (
                <Space key={c.id} direction="vertical" align="center">
                  <Avatar size={72} src={c.avatar} />
                  <Text strong>{c.name}</Text>
                  <Text type="secondary">{c.meta}</Text>
                </Space>
              ))}
            </Space>
          </Card>

          {/* News */}
          <Card title="News & Insights" className="shadow-sm rounded-2xl">
            <List
              grid={{ gutter: 16, xs: 1, md: 3 }}
              dataSource={NEWS}
              renderItem={(n) => (
                <List.Item>
                  <Card className="rounded-2xl shadow-sm overflow-hidden">
                    <div className="h-36 w-full overflow-hidden rounded-xl mb-3">
                      <img src={n.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[13px] font-semibold text-emerald-700 mb-1">{n.tag}</div>
                    <div className="text-lg font-extrabold text-neutral-800 mb-1">{n.title}</div>
                    <div className="text-neutral-600 text-[14px]">{n.desc}</div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </section>
      </div>
    </GradientShell>
  );
}
