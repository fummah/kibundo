// src/pages/parent/communications/Newsletter.jsx
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Checkbox,
  message,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  ScheduleOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import BottomTabBar from "@/components/parent/BottomTabBar";
import ParentSpaceBar from "@/components/parent/ParentSpaceBar";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Title, Text } = Typography;

/* ----------------------------- Dummy issues ----------------------------- */
const ISSUES = [
  {
    id: "n-2409-1",
    title: "Back-to-School Tips: Routines that stick",
    excerpt:
      "Kick off the term with simple habits for homework, sleep, and screen time.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop",
    sent_at: dayjs().subtract(7, "day").toISOString(),
    tags: ["Tips", "Routines", "Primary"],
  },
  {
    id: "n-2408-2",
    title: "Reading Made Fun: 7 micro-games",
    excerpt:
      "Turn 10 minutes into meaningful reading practice with quick, playful prompts.",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop",
    sent_at: dayjs().subtract(21, "day").toISOString(),
    tags: ["Reading", "Games"],
  },
  {
    id: "n-2408-1",
    title: "Math Confidence: small wins, big impact",
    excerpt:
      "Build momentum with bite-sized goals and celebrate progress every week.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop",
    sent_at: dayjs().subtract(30, "day").toISOString(),
    tags: ["Math", "Mindset"],
  },
];

/* ----------------------------- Page ----------------------------- */
export default function Newsletter() {
  // Preferences (dummy/local only)
  const [email, setEmail] = useState("parent@example.com");
  const [subscribed, setSubscribed] = useState(true);
  const [frequency, setFrequency] = useState("weekly"); // weekly | monthly | only_updates
  const [topics, setTopics] = useState(["reading", "math"]);
  const [autoWeeklyDigest, setAutoWeeklyDigest] = useState(true);
  const [autoActivitySummary, setAutoActivitySummary] = useState(true);
  const [autoProductNews, setAutoProductNews] = useState(false);

  const [query, setQuery] = useState("");

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ISSUES;
    return ISSUES.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.excerpt.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  const columns = [
    {
      title: "Subject",
      dataIndex: "title",
      key: "title",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <span className="font-semibold">{v}</span>
          <Text type="secondary" className="!text-xs">
            {r.excerpt}
          </Text>
        </Space>
      ),
    },
    {
      title: "Tags",
      key: "tags",
      width: 220,
      render: (_, r) => (
        <Space wrap>
          {r.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Sent",
      dataIndex: "sent_at",
      key: "sent_at",
      width: 140,
      render: (v) => dayjs(v).format("MMM D, YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => message.info(`Open issue: ${r.id}`)}
        >
          Read
        </Button>
      ),
    },
  ];

  const save = () => {
    message.success("Newsletter preferences saved");
  };

  const refresh = () => {
    message.success("Newsletter refreshed");
  };

  return (
    // Desktop mock container
    <div className="relative mx-auto max-w-[720px] w-full lg:shadow-2xl lg:rounded-[32px] overflow-hidden">
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: `url(${globalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Scrollable area; sticky bar lives inside this element */}
        <main className="flex-1 overflow-y-auto">
          {/* page padding; extra bottom space provided by ParentSpaceBar */}
          <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <Title level={2} className="!m-0">
                  Newsletter
                </Title>
                <p className="text-gray-600 m-0">
                  Manage your subscription, topics, and read past issues.
                </p>
              </div>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                Refresh
              </Button>
            </div>

            {/* Preferences */}
            <Card className="rounded-2xl shadow-sm">
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={12} lg={10}>
                  <div className="flex items-center gap-2">
                    <MailOutlined className="text-gray-500" />
                    <Text type="secondary">Delivery address</Text>
                  </div>
                  <Input
                    className="mt-2 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <Text>Status:</Text>
                    {subscribed ? (
                      <Badge color="#6D8F00" text="Subscribed" />
                    ) : (
                      <Badge color="#f5222d" text="Unsubscribed" />
                    )}
                    <Switch
                      checked={subscribed}
                      onChange={setSubscribed}
                      checkedChildren="On"
                      unCheckedChildren="Off"
                    />
                  </div>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <div className="flex items-center gap-2">
                    <ScheduleOutlined className="text-gray-500" />
                    <Text type="secondary">Frequency</Text>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <Segmented
                      value={frequency}
                      onChange={setFrequency}
                      options={[
                        { label: "Weekly", value: "weekly" },
                        { label: "Monthly", value: "monthly" },
                        { label: "Only updates", value: "only_updates" },
                      ]}
                      size="large"
                    />
                  </div>
                  <div className="mt-3">
                    <Text type="secondary">Topics</Text>
                    <Checkbox.Group
                      className="block mt-2"
                      value={topics}
                      onChange={(v) => setTopics(v)}
                    >
                      <Space direction="vertical">
                        <Checkbox value="reading">Reading & language</Checkbox>
                        <Checkbox value="math">Math & logic</Checkbox>
                        <Checkbox value="science">Science & nature</Checkbox>
                        <Checkbox value="parenting">Parenting tips</Checkbox>
                      </Space>
                    </Checkbox.Group>
                  </div>
                </Col>

                <Col xs={24} lg={6}>
                  <div className="bg-white/70 rounded-2xl p-3 border">
                    <div className="font-semibold mb-2">Automations</div>
                    <Space direction="vertical" className="w-full">
                      <div className="flex items-center justify-between">
                        <span>Weekly digest</span>
                        <Switch
                          checked={autoWeeklyDigest}
                          onChange={setAutoWeeklyDigest}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Activity summary</span>
                        <Switch
                          checked={autoActivitySummary}
                          onChange={setAutoActivitySummary}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Product updates</span>
                        <Switch
                          checked={autoProductNews}
                          onChange={setAutoProductNews}
                        />
                      </div>
                    </Space>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    className="mt-3 w-full h-11 rounded-full bg-[#C7D425] text-neutral-900 border-none hover:!bg-[#b8c61d]"
                    icon={<SendOutlined />}
                    onClick={save}
                  >
                    Save Preferences
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Latest issue (hero) */}
            <Card className="rounded-2xl shadow-sm">
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={10}>
                  <img
                    src={ISSUES[0].image}
                    alt={ISSUES[0].title}
                    className="w-full h-48 md:h-56 object-cover rounded-xl"
                  />
                </Col>
                <Col xs={24} md={14}>
                  <div className="flex items-center gap-2">
                    <Tag color="blue">Latest</Tag>
                    <Text type="secondary">
                      {dayjs(ISSUES[0].sent_at).format("MMM D, YYYY")}
                    </Text>
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold mt-1">
                    {ISSUES[0].title}
                  </h3>
                  <p className="text-gray-600">{ISSUES[0].excerpt}</p>
                  <Space wrap>
                    {ISSUES[0].tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </Space>
                  <div className="mt-3">
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => message.info("Open latest issue")}
                    >
                      Read issue
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Search */}
            <Card className="rounded-2xl shadow-sm">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={12} lg={10}>
                  <Input
                    allowClear
                    prefix={<MailOutlined />}
                    placeholder="Search past issues by title, tag, or summary"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="rounded-xl"
                  />
                </Col>
              </Row>
            </Card>

            {/* Mobile list */}
            <div className="block md:hidden">
              {filteredIssues.length === 0 ? (
                <Card className="rounded-2xl shadow-sm">
                  <Empty description="No issues found." />
                </Card>
              ) : (
                <List
                  dataSource={filteredIssues}
                  renderItem={(i) => (
                    <Card className="rounded-2xl shadow-sm mb-3">
                      <div className="flex gap-3">
                        <img
                          src={i.image}
                          alt={i.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text type="secondary" className="text-xs">
                              {dayjs(i.sent_at).format("MMM D, YYYY")}
                            </Text>
                            <Space size={4} wrap>
                              {i.tags.map((t) => (
                                <Tag key={t}>{t}</Tag>
                              ))}
                            </Space>
                          </div>
                          <div className="font-semibold mt-1">{i.title}</div>
                          <div className="text-gray-600 text-sm">
                            {i.excerpt}
                          </div>
                          <div className="mt-2">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => message.info(`Open: ${i.id}`)}
                            >
                              Read
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                />
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Card className="rounded-2xl shadow-sm">
                {filteredIssues.length === 0 ? (
                  <Empty description="No issues found." />
                ) : (
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredIssues}
                    pagination={{ pageSize: 6, showSizeChanger: false }}
                  />
                )}
              </Card>
            </div>

            {/* Space so content never hides behind the sticky bottom tabs */}
            <ParentSpaceBar />
          </div>

          {/* Sticky bottom nav inside the scroller */}
          <BottomTabBar />
        </main>
      </div>
    </div>
  );
}
