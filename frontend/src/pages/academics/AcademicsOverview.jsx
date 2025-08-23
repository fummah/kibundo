// src/pages/NicePage.jsx
import React from "react";
import {
  Row, Col, Card, Typography, Space, Button, Tag,
  List, Avatar, Timeline, Grid, Tooltip, Badge, Select
} from "antd";
import {
  ReadOutlined,
  BookOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  TeamOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  SmileOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function NicePage() {
  const screens = useBreakpoint();
  const navigate = useNavigate();

  /* ---------------- KPI (Overview) ---------------- */
  // Overview requires number of scans
  const kpis = [
    { title: "Students",  value: 1240, icon: <TeamOutlined />,       gradient: "from-indigo-600 to-violet-600" },
    { title: "Curricula", value: 42,   icon: <ReadOutlined />,       gradient: "from-sky-500 to-cyan-500" },
    { title: "Quizzes",   value: 318,  icon: <ExperimentOutlined />, gradient: "from-emerald-500 to-teal-500" },
    { title: "Scans",     value: 827,  icon: <FileTextOutlined />,   gradient: "from-rose-500 to-orange-500" }
  ];

  /* ---------------- Features ---------------- */
  const features = [
    {
      icon: <ReadOutlined style={{ fontSize: 26, color: "#1677ff" }} />,
      title: "Curricula",
      desc: "Tie each subject to state • grade • year. Link quizzes, games & worksheets.",
      onClick: () => navigate("/admin/academics/curricula"),
      // Quick links (only to existing routes)
      footer: (
        <Space wrap size={[6, 6]}>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); navigate("/admin/academics/quiz"); }}
          >
            Quizzes
          </Button>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); navigate("/admin/academics/game"); }}
          >
            Games
          </Button>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); navigate("/admin/academics/worksheet"); }}
          >
            Worksheets
          </Button>
          {/* No dedicated upload route in AdminRoutes → point to Curricula page */}
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate("/admin/academics/curricula"); }}
          >
            Upload (state/subject)
          </Button>
        </Space>
      )
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: 26, color: "#52c41a" }} />,
      title: "Quiz Studio",
      desc: "Editor (form builder) for adaptive quizzes. Version & publish.",
      onClick: () => navigate("/admin/academics/quiz")
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 26, color: "#fa8c16" }} />,
      title: "Worksheet Editor",
      desc: "Rich editor; supports partial worksheet (Q&A mode).",
      onClick: () => navigate("/admin/academics/worksheet")
    },
    {
      icon: <PlayCircleOutlined style={{ fontSize: 26, color: "#13c2c2" }} />,
      title: "Games",
      desc: "Skill practice — placeholder for future.",
      onClick: () => navigate("/admin/academics/game")
    },
    {
      icon: <BulbOutlined style={{ fontSize: 26, color: "#eb2f96" }} />,
      title: "Kibundo (Manage & Train)",
      desc: "Fine-tune prompts, datasets & guardrails for the AI assistant.",
      onClick: () => navigate("/admin/academics/ai-agent")
    },
    {
      icon: <BookOutlined style={{ fontSize: 26, color: "#2f54eb" }} />,
      title: "Subjects",
      desc: "List of offered subjects & availability, tied to curricula.",
      onClick: () => navigate("/admin/academics/subjects")
    }
  ];

  /* ---------------- What's New / Roadmap ---------------- */
  const updates = [
    { title: "Reading exercises added",      tag: "New",      color: "green",  by: "Content",   when: "2d ago" },
    { title: "Curricula links: all assets",  tag: "Improved", color: "blue",   by: "Platform",  when: "5d ago" },
    { title: "Worksheet partial Q&A mode",   tag: "Beta",     color: "purple", by: "Academics", when: "1w ago" }
  ];

  const timeline = [
    { c: "Kibundo training presets", color: "green" },
    { c: "Quiz Studio bulk import",  color: "blue" },
    { c: "Reading difficulty bands", color: "orange" },
    { c: "Subject catalog revamp",   color: "gray" }
  ];

  /* ---------------- Scans Panel ---------------- */
  // OCR language defaults to German; each item shows description, publisher tag, time
  const scans = [
    { id: 1, description: "Worksheet Scan: Fractions Practice", publisher: "Teacher Desk", time: "2h ago", language: "German" },
    { id: 2, description: "Reading Passage OCR: Die Bremer Stadtmusikanten", publisher: "Content Team", time: "Yesterday", language: "German" },
    { id: 3, description: "Homework Upload: Algebra Basics", publisher: "Student Portal", time: "Mon 13:05", language: "German" }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={14}>
              <Space direction="vertical" size={8} className="w-full">
                <Title level={2} className="!mb-1">Academics</Title>
                <Text type="secondary">
                  Build curricula tied to state, grade & year. Create quizzes, worksheets (incl. Q&A mode), manage Kibundo, and process scans with German OCR.
                </Text>
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-auto max-w-7xl px-4 -mt-6 md:-mt-8">
        <Row gutter={[16, 16]}>
          {kpis.map((k) => (
            <Col key={k.title} xs={12} md={6}>
              <Card
                hoverable
                className={`rounded-xl text-white bg-gradient-to-br ${k.gradient}`}
                styles={{ body: { minHeight: 110, display: "flex", alignItems: "center" } }}
              >
                <div className="w-full flex items-center justify-between">
                  <Space>
                    <Avatar className="bg-white/20" icon={k.icon} />
                    <div>
                      <span className="text-white/80 text-xs">{k.title}</span>
                      <div className="text-2xl md:text-3xl font-bold leading-none">{k.value}</div>
                    </div>
                  </Space>
                  <Tooltip title="Sample metric">
                    <SmileOutlined />
                  </Tooltip>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Content sections */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Row gutter={[16, 16]}>
          {/* Features */}
          <Col xs={24} lg={14}>
            <Card
              hoverable
              title={<Space><ThunderboltOutlined /> Key Capabilities</Space>}
              extra={
                <Button type="link" onClick={() => navigate("/admin/academics")}>
                  Open Academics <ArrowRightOutlined />
                </Button>
              }
            >
              <Row gutter={[12, 12]}>
                {features.map((f) => (
                  <Col key={f.title} xs={24} sm={12}>
                    <Card hoverable size="small" onClick={f.onClick} className="h-full">
                      <Space direction="vertical" size={8} className="w-full">
                        {f.icon}
                        <div className="font-semibold">{f.title}</div>
                        <Text type="secondary">{f.desc}</Text>
                        <div className="flex items-center justify-between">
                          <Button type="link" className="!px-0">Open <ArrowRightOutlined /></Button>
                          {f.footer ? <div onClick={(e) => e.stopPropagation()}>{f.footer}</div> : null}
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          {/* Updates & Roadmap */}
          <Col xs={24} lg={10}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Card hoverable title="What’s New">
                <List
                  itemLayout="horizontal"
                  dataSource={updates}
                  renderItem={(u) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<RocketOutlined />} />}
                        title={<span className="font-medium">{u.title}</span>}
                        description={
                          <Space size="small">
                            <Tag color={u.color}>{u.tag}</Tag>
                            <Text type="secondary">• {u.by} • {u.when}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card hoverable title="Roadmap">
                <Timeline items={timeline.map((t) => ({ color: t.color, children: t.c }))} />
              </Card>
            </Space>
          </Col>
        </Row>

        {/* Scans Panel (under Academics) */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24}>
            <Card
              hoverable
              title={
                <Space>
                  <FileTextOutlined />
                  Scans
                </Space>
              }
              extra={
                <Space>
                  <span className="text-gray-500">OCR Language</span>
                  <Select
                    size="small"
                    value="German"
                    options={[{ value: "German", label: "German" }]}
                    style={{ width: 120 }}
                    onChange={() => {}}
                  />
                  {/* No /scans/new route → navigate to scans overview */}
                  <Button type="primary" onClick={() => navigate("/admin/academics/scans")}>
                    Open Scans
                  </Button>
                </Space>
              }
            >
              <List
                dataSource={scans}
                renderItem={(s) => (
                  <List.Item
                    actions={[
                      <Tooltip key="lang" title={`OCR: ${s.language}`}>
                        <Badge status="processing" text={s.language} />
                      </Tooltip>,
                    ]}
                    onClick={() => navigate("/admin/academics/scans")}
                    style={{ cursor: "pointer" }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<FileTextOutlined />} />}
                      title={<span className="font-medium">{s.description}</span>}
                      description={
                        <Space size="small" wrap>
                          <Tag color="blue">{s.publisher}</Tag>
                          <Text type="secondary"><ClockCircleOutlined /> {s.time}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* CTA */}
        <Card
          className="mt-4 rounded-2xl"
          styles={{ body: { padding: screens.md ? 24 : 16 } }}
          hoverable
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Title level={4} className="!mb-1">Ready to build your next unit?</Title>
              <Text type="secondary">
                Start a curriculum, auto-generate quiz items with learning goals, and share with your team.
              </Text>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: screens.md ? "right" : "left" }}>
              <Space wrap>
                <Button onClick={() => navigate("/admin/academics/quiz")}>Create Quiz</Button>
                <Button type="primary" onClick={() => navigate("/admin/academics/curricula")}>
                  New Curriculum
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
