// src/pages/NicePage.jsx
import React from "react";
import {
  Row, Col, Card, Typography, Space, Button, Statistic, Tag,
  List, Avatar, Progress, Timeline, Grid, Tooltip, Badge
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
  CrownOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

export default function NicePage() {
  const screens = useBreakpoint();
  const navigate = useNavigate();

  // ---- dummy data ----
  const kpis = [
    { title: "Students", value: 1240, icon: <TeamOutlined />, gradient: "from-indigo-600 to-violet-600" },
    { title: "Curricula", value: 42, icon: <ReadOutlined />, gradient: "from-sky-500 to-cyan-500" },
    { title: "Quizzes", value: 318, icon: <ExperimentOutlined />, gradient: "from-emerald-500 to-teal-500" },
    { title: "Worksheets", value: 207, icon: <FileTextOutlined />, gradient: "from-rose-500 to-orange-500" }
  ];

  const features = [
    {
      icon: <ReadOutlined style={{ fontSize: 26, color: "#1677ff" }} />,
      title: "Curricula Builder",
      desc: "Versioned, state-aligned plans with review workflows.",
      onClick: () => navigate("/admin/academics/curricula")
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: 26, color: "#52c41a" }} />,
      title: "Quiz Studio",
      desc: "Build, tag and publish adaptive quizzes in minutes.",
      onClick: () => navigate("/admin/academics/quiz")
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 26, color: "#fa8c16" }} />,
      title: "Worksheet Designer",
      desc: "Create printable or interactive sheets with ease.",
      onClick: () => navigate("/admin/academics/worksheet")
    },
    {
      icon: <BulbOutlined style={{ fontSize: 26, color: "#eb2f96" }} />,
      title: "AI Teaching Assistant",
      desc: "Draft objectives, generate items, align to standards.",
      onClick: () => navigate("/admin/academics/ai-agent")
    }
  ];

  const updates = [
    { title: "Quiz randomization modes", tag: "New", color: "green", by: "Product", when: "2d ago" },
    { title: "Bundesland filters added", tag: "Improved", color: "blue", by: "Platform", when: "5d ago" },
    { title: "Worksheet templates (Math/DE)", tag: "Beta", color: "purple", by: "Content", when: "1w ago" }
  ];

  const timeline = [
    { c: "Curriculum versioning GA", color: "green" },
    { c: "Bulk import for quizzes", color: "blue" },
    { c: "Parents access portal", color: "orange" },
    { c: "Analytics drill-downs", color: "gray" }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={14}>
              <Space direction="vertical" size={12} className="w-full">
                {/* PAGE TITLE */}
                <Title level={2} className="!mb-1">Academics</Title>
              
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
                  <Tooltip title="Dummy metric">
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
              extra={<Button type="link" onClick={() => navigate("/admin/academics")}>Open Academics <ArrowRightOutlined /></Button>}
            >
              <Row gutter={[12, 12]}>
                {features.map((f) => (
                  <Col key={f.title} xs={24} sm={12}>
                    <Card hoverable size="small" onClick={f.onClick} className="h-full">
                      <Space direction="vertical" size={8}>
                        {f.icon}
                        <div className="font-semibold">{f.title}</div>
                        <Text type="secondary">{f.desc}</Text>
                        <Button type="link" className="!px-0">Open <ArrowRightOutlined /></Button>
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
