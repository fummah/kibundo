import { Link } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
 import {
   HomeOutlined,
   PlusCircleOutlined,
   ReadOutlined,
   MessageOutlined,
   SettingOutlined,
   FileDoneOutlined,
   BellOutlined,
   TeamOutlined,
    TrophyOutlined,
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
import { useTranslation } from "react-i18next";
import BottomTabBar from "@/components/parent/BottomTabBar";

const { Title, Text } = Typography;

/* ---------------- Dummy content (shared by mobile & desktop) ---------------- */
const avatar1 = "https://i.pravatar.cc/120?img=5";
const avatar2 = "https://i.pravatar.cc/120?img=12";

const CHILDREN = [
  { id: 1, name: "Name Child one", meta: "Age X, Grade 3", avatar: avatar1 },
  { id: 2, name: "Name Child two", meta: "Age X, Grade 1", avatar: avatar2 },
];

const ACTIVITIES = [
  { id: 1, childId: 1, child: "Name Child one", text: "Completed a math lesson for homework", when: "Today 14:20", tag: "Math", avatar: avatar1 },
  { id: 2, childId: 2, child: "Name Child two", text: "Started a reading exercise", when: "Yesterday 17:05", tag: "Reading", avatar: avatar2 },
  { id: 3, childId: 1, child: "Name Child one", text: "Viewed Science resource", when: "Mon 10:11", tag: "Science", avatar: avatar1 },
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
function ActivityCard({ to, avatar, name, text, bg = "bg-cyan-200" }) {
  return (
    <Link
      to={to}
      className={`block w-full ${bg} rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/60 transition
                 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
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
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.12)] ring-4 ring-white/60
                      transition hover:-translate-y-0.5 hover:shadow-lg">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="text-sm font-semibold text-neutral-800 leading-tight">{name}</div>
      <div className="text-xs text-neutral-500">{meta}</div>
    </Link>
  );
}
function NewsCard({ to, tag, title, desc, image }) {
  return (
    <Link
      to={to}
      className="block w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)] border border-white/70
                 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
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
    </Link>
  );
}

/* ---------------- Page ---------------- */
export default function ParentHome() {
  const { t } = useTranslation();

  // Clickable stat cards -> routes
  const statCards = [
    { title: t("parent.home.stats.activeChildren"), value: CHILDREN.length, icon: <TeamOutlined />, to: "/parent/myfamily" },
    { title: t("parent.home.stats.thisWeekActivity"), value: 8, icon: null, to: "/parent/activities" },
    { title: t("parent.home.stats.badgesEarned"), value: 3, icon: <TrophyOutlined />, to: "/parent/achievements" },
    { title: t("parent.home.stats.unpaidInvoices"), value: 1, icon: <FileDoneOutlined />, to: "/parent/billing/invoices" },
  ];

  return (
    <GradientShell>
      <div className="mx-auto max-w-[1200px] pt-6 pb-28 md:pb-8 px-4 md:px-6">
        {/* ---------------- Mobile ---------------- */}
        <section className="mobile-only space-y-6">
          <h1 className="text-2xl font-extrabold text-neutral-800">{t("parent.home.title")}</h1>

          {/* Activities */}
          <section>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-3">{t("parent.home.activities")}</h2>
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
            <h2 className="text-xl font-extrabold text-neutral-800 mb-4">{t("parent.home.myFamily")}</h2>
            <div className="flex items-start gap-8">
              {CHILDREN.map((c) => (
                <ChildBubble
                  key={c.id}
                  to={`/parent/myfamily/student/${c.id}`}
                  avatar={c.avatar}
                  name={c.name}
                  meta={c.meta}
                />
              ))}
            </div>
            <hr className="mt-6 border-0 h-px bg-neutral-300/60" />
          </section>

          {/* News & Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-800">{t("parent.home.newsInsights")}</h2>
            {NEWS.map((n) => (
              <NewsCard key={n.id} to="/parent/communications/news" {...n} />
            ))}
          </section>

          <BottomTabBar />
        </section>

        {/* ---------------- Desktop ---------------- */}
        <section className="desktop-only space-y-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <Title level={3} className="!mb-0">{t("parent.home.title")}</Title>
              <Text type="secondary">{t("parent.home.subtitle")}</Text>
            </div>
          <Space>
              {/* No Scan Homework in Parent views */}
              <Link to="/parent/myfamily/add-student">
                <Button icon={<PlusCircleOutlined />}>{t("parent.home.addChild")}</Button>
              </Link>
            </Space>
          </div>

          {/* Clickable Stat Cards */}
          <Row gutter={[16, 16]}>
            {statCards.map((s, i) => (
              <Col xs={12} md={6} key={i}>
                <Link
                  to={s.to}
                  className="block rounded-2xl transition transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Card
                    hoverable
                    className="shadow-sm rounded-2xl transition hover:shadow-lg"
                    bodyStyle={{ padding: 16 }}
                  >
                    <div className="flex items-center justify-between">
                      <Statistic title={s.title} value={s.value} />
                      {s.icon && <span className="text-xl text-gray-500">{s.icon}</span>}
                    </div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>

          {/* Two-column: Activities + Notices */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Card title={t("parent.home.activities")} className="shadow-sm rounded-2xl">
                <List
                  itemLayout="horizontal"
                  dataSource={ACTIVITIES}
                  renderItem={(item) => (
                    <List.Item className="!px-0" key={item.id}>
                      <Link
                        to={`/parent/myfamily/student/${item.childId}`}
                        className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
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
                      </Link>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title={
                  <span className="flex items-center">
                    <BellOutlined className="mr-2" /> {t("parent.home.notices")}
                  </span>
                }
                className="shadow-sm rounded-2xl"
              >
                <List
                  dataSource={NOTICES}
                  renderItem={(n) => (
                    <List.Item className="!px-0" key={n.id}>
                      <Link
                        to="/parent/billing/invoices"
                        className="flex-1 block px-3 py-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <Text type={n.type === "warning" ? "danger" : "secondary"}>{n.title}</Text>
                      </Link>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          {/* My Family */}
          <Card title={t("parent.home.myFamily")} className="shadow-sm rounded-2xl">
            <Space size="large" wrap>
              {CHILDREN.map((c) => (
                <Link
                  key={c.id}
                  to={`/parent/myfamily/student/${c.id}`}
                  className="transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
                >
                  <Space direction="vertical" align="center">
                    <Avatar size={72} src={c.avatar} />
                    <Text strong>{c.name}</Text>
                    <Text type="secondary">{c.meta}</Text>
                  </Space>
                </Link>
              ))}
            </Space>
          </Card>

          {/* News */}
          <Card title={t("parent.home.newsInsights")} className="shadow-sm rounded-2xl">
            <List
              grid={{ gutter: 16, xs: 1, md: 3 }}
              dataSource={NEWS}
              renderItem={(n) => (
                <List.Item key={n.id}>
                  <Link
                    to="/parent/communications/news"
                    className="block rounded-2xl overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Card hoverable className="rounded-2xl shadow-sm overflow-hidden">
                      <div className="h-36 w-full overflow-hidden mb-3">
                        <img src={n.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[13px] font-semibold text-emerald-700 mb-1">{n.tag}</div>
                      <div className="text-lg font-extrabold text-neutral-800 mb-1">{n.title}</div>
                      <div className="text-neutral-600 text-[14px]">{n.desc}</div>
                    </Card>
                  </Link>
                </List.Item>
              )}
            />
          </Card>
        </section>
      </div>
    </GradientShell>
  );
}
