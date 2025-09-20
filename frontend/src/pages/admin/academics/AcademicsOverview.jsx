// src/pages/admin/academics/AcademicsOverview.jsx
import React, { useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import api from "@/api/axios"; // your configured axios (adds baseURL, token, etc.)
import { message } from "antd";
import { listQuizzes } from "@/api/academics/quizzes.js";
import { useTopbar } from "@/components/layouts/GlobalLayout.jsx";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/* Helpers */
function fmtDate(input) {
  if (!input) return "";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? String(input) : d.toLocaleString();
}
const safeLen = (v) => (Array.isArray(v) ? v.length : 0);

export default function NicePage() {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const topbar = useTopbar();
  const [messageApi, contextHolder] = message.useMessage();

  /* ---------------- Live data from your API ---------------- */
  // GET /allstudents (protected) — kept in case you still need it elsewhere
  const studentsQ = useQuery({
    queryKey: ["allstudents"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/allstudents");
        return Array.isArray(data) ? data : [];
      } catch (error) {
        messageApi.error("Failed to fetch students");
        return [];
      }
    },
    keepPreviousData: true,
  });

  // GET /allsubjects (protected)
  const subjectsQ = useQuery({
    queryKey: ["allsubjects"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/allsubjects");
        return Array.isArray(data) ? data : [];
      } catch (error) {
        messageApi.error("Failed to fetch subjects");
        return [];
      }
    },
    keepPreviousData: true,
  });

  // GET /quizzes (protected) — use your existing helper to normalize shapes
  const quizzesQ = useQuery({
    queryKey: ["quizzes", { page: 1, pageSize: 50 }],
    queryFn: async () => {
      try {
        // Ensure we await the helper; some helpers return a Promise of { items, total }
        return await listQuizzes({ page: 1, pageSize: 50 });
      } catch (error) {
        messageApi.error("Failed to fetch quizzes");
        return [];
      }
    },
    keepPreviousData: true,
  });

  // GET /curiculums (protected) — note the route spelling you provided
  const curriculaQ = useQuery({
    queryKey: ["curiculums"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/curiculums");
        // Support either a plain array or { items: [...] }
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
      } catch (error) {
        messageApi.error("Failed to fetch curricula");
        return [];
      }
    },
    keepPreviousData: true,
  });

  const subjectsCount = safeLen(subjectsQ.data);
  // Quizzes may be returned as an array or as { items, total }
  const quizItems = Array.isArray(quizzesQ.data?.items)
    ? quizzesQ.data.items
    : (Array.isArray(quizzesQ.data) ? quizzesQ.data : []);
  const quizzesTotal = Number.isFinite(quizzesQ.data?.total)
    ? quizzesQ.data.total
    : quizItems.length;

  const curriculaItems = Array.isArray(curriculaQ.data) ? curriculaQ.data : [];
  const curriculaCount = safeLen(curriculaItems);

  // Debug: Log the first quiz item to see its structure
  useEffect(() => {
    if (quizItems.length > 0) {
      console.log('Quiz items:', quizItems);
      console.log('First quiz item:', quizItems[0]);
      console.log('First quiz item keys:', Object.keys(quizItems[0]));
      console.log('First quiz item values:', JSON.stringify(quizItems[0], null, 2));
    }
  }, [quizItems]);

  // Recent quizzes (newest first by created_at / createdAt)
  const recentQuizzes = [...quizItems]
    .sort(
      (a, b) =>
        new Date(b?.created_at ?? b?.createdAt ?? 0) -
        new Date(a?.created_at ?? a?.createdAt ?? 0)
    )
    .slice(0, 5);

  // Recent curricula (newest by updated_at/created_at)
  const recentCurricula = [...curriculaItems]
    .sort((a, b) => {
      const bTime = new Date(b?.updated_at ?? b?.updatedAt ?? b?.created_at ?? b?.createdAt ?? 0).getTime();
      const aTime = new Date(a?.updated_at ?? a?.updatedAt ?? a?.created_at ?? a?.createdAt ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  /* ---------------- KPIs ---------------- */
  // Replaced “Students” with “Curricula” and bound to /curiculums
  const kpis = [
    { title: "Curricula", value: curriculaCount, icon: <ReadOutlined />,       gradient: "from-indigo-600 to-violet-600" },
    { title: "Subjects",  value: subjectsCount,  icon: <ReadOutlined />,       gradient: "from-sky-500 to-cyan-500" },
    { title: "Quizzes",   value: quizzesTotal,   icon: <ExperimentOutlined />, gradient: "from-emerald-500 to-teal-500" },
    { title: "Scans",     value: 0,              icon: <FileTextOutlined />,   gradient: "from-rose-500 to-orange-500" }, // no scans route provided
  ];

  /* ---------------- Topbar integration ---------------- */
  useEffect(() => {
    if (!topbar) return;
    topbar.setTopbar({
      title: "Academics",
      subtitle: "Curricula, subjects, quizzes and scans",
      tagCount: quizzesTotal,
      rightExtra: (
        <Space>
          <Button size="small" onClick={() => navigate("/admin/academics/quizzes")}>Quizzes</Button>
          <Button size="small" type="primary" onClick={() => navigate("/admin/academics/curricula")}>Curricula</Button>
        </Space>
      ),
      onRefresh: async () => {
        try {
          await Promise.all([
            subjectsQ.refetch(),
            quizzesQ.refetch(),
            curriculaQ.refetch(),
            studentsQ.refetch(),
          ]);
        } catch (error) {
          messageApi.error("Failed to refresh data");
        }
      },
    });
    return () => topbar.resetTopbar && topbar.resetTopbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzesTotal]);

  /* ---------------- Features ---------------- */
  const features = [
    {
      icon: <ReadOutlined style={{ fontSize: 26, color: "#1677ff" }} />,
      title: "Curricula",
      desc: "Tie each subject to state • grade • year. Link quizzes, games & worksheets.",
      onClick: () => navigate("/admin/academics/curricula"),
      footer: (
        <Space wrap size={[6, 6]}>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); navigate("/admin/academics/quizzes"); }}
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
      onClick: () => navigate("/admin/academics/quizzes"),
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 26, color: "#fa8c16" }} />,
      title: "Worksheet Editor",
      desc: "Rich editor; supports partial worksheet (Q&A mode).",
      onClick: () => navigate("/admin/academics/worksheet"),
    },
    {
      icon: <PlayCircleOutlined style={{ fontSize: 26, color: "#13c2c2" }} />,
      title: "Games",
      desc: "Skill practice — placeholder for future.",
      onClick: () => navigate("/admin/academics/game"),
    },
    {
      icon: <BulbOutlined style={{ fontSize: 26, color: "#eb2f96" }} />,
      title: "Kibundo (Manage & Train)",
      desc: "Fine-tune prompts, datasets & guardrails for the AI assistant.",
      onClick: () => navigate("/admin/academics/kibundo"),
    },
    {
      icon: <BookOutlined style={{ fontSize: 26, color: "#2f54eb" }} />,
      title: "Subjects",
      desc: "List of offered subjects & availability, tied to curricula.",
      onClick: () => navigate("/admin/academics/subjects"),
    },
  ];

  /* ---------------- Static panels (unchanged) ---------------- */
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
        <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={14}>
              <Space direction="vertical" size={8} className="w-full">
                <Title level={2} className="!mb-1">Academics</Title>
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* KPIs (Curricula / Subjects / Quizzes) */}
      <div className="mx-auto max-w-7xl px-4 -mt-6 md:-mt-8">
        <Row gutter={[16, 16]}>
          {kpis.map((k) => (
            <Col key={k.title} xs={12} md={6}>
              <Card
                hoverable
                className={
                  "rounded-xl text-white bg-gradient-to-br " + (k.gradient || "")
                }
                styles={{
                  body: { minHeight: 110, display: "flex", alignItems: "center" },
                }}
                loading={
                  (k.title === "Curricula" && curriculaQ.isFetching) ||
                  (k.title === "Subjects" && subjectsQ.isFetching) ||
                  (k.title === "Quizzes" && quizzesQ.isFetching)
                }
              >
                <div className="w-full flex items-center justify-between">
                  <Space>
                    <Avatar className="bg-white/20" icon={k.icon} />
                    <div>
                      <span className="text-white/80 text-xs">{k.title}</span>
                      <div className="text-2xl md:text-3xl font-bold leading-none">
                        {k.value}
                      </div>
                    </div>
                  </Space>
                  <Tooltip
                    title={
                      k.title === "Curricula"
                        ? "/curiculums"
                        : k.title === "Subjects"
                        ? "/allsubjects"
                        : k.title === "Quizzes"
                        ? "/quizzes"
                        : "placeholder"
                    }
                  >
                    <SmileOutlined />
                  </Tooltip>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

      </div>

      {/* Content sections */}
      <div className="container mx-auto px-4 py-6">
        {contextHolder}
        <div className="mb-6">
          <Title level={2} className="mb-1">Academics Overview</Title>
          <Text type="secondary">Manage your educational content and activities</Text>
        </div>
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

          {/* What's New + Roadmap */}
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

        {/* Recent Curricula (live from /curiculums) */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24}>
            <Card
              hoverable
              title={<Space><ReadOutlined /> Recent Curricula</Space>}
              extra={
                <Button type="link" onClick={() => navigate("/admin/academics/curricula")}>
                  Open Curricula <ArrowRightOutlined />
                </Button>
              }
            >
              <List
                loading={curriculaQ.isFetching}
                dataSource={recentCurricula}
                locale={{ emptyText: "No curricula yet" }}
                renderItem={(c) => {
                  const id = c?.id ?? c?._id ?? c?.uuid;
                  const when =
                    c?.updated_at ?? c?.updatedAt ?? c?.created_at ?? c?.createdAt;
                  return (
                    <List.Item
                      onClick={() => id && navigate(`/curriculum/${id}`)}
                      style={{ cursor: id ? "pointer" : "default" }}
                      actions={[
                        c?.status ? <Tag key="status" color={c.status === "live" ? "green" : "default"}>{c.status}</Tag> : null,
                        when ? <Text key="when" type="secondary">Updated: {fmtDate(when)}</Text> : null,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<ReadOutlined />} />}
                        title={
                          <span className="font-medium">
                            {c?.title || `${c?.subject ?? "Subject"} • Grade ${c?.grade ?? "?"}`}
                          </span>
                        }
                        description={
                          <Space size="small" wrap>
                            {c?.bundesland ? <Tag color="purple">{c.bundesland}</Tag> : null}
                            {c?.subject ? <Tag>{c.subject}</Tag> : null}
                            {c?.grade ? <Tag color="blue">Grade {c.grade}</Tag> : null}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Recent Quizzes (live from /quizzes) */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24}>
            <Card
              hoverable
              title={<Space><ExperimentOutlined /> Recent Quizzes</Space>}
              extra={
                <Button type="link" onClick={() => navigate("/admin/academics/quizzes")}>
                  Open Quizzes <ArrowRightOutlined />
                </Button>
              }
            >
              <List
                loading={quizzesQ.isFetching}
                dataSource={recentQuizzes}
                locale={{ emptyText: "No quizzes yet" }}
                renderItem={(q) => (
                  <List.Item
                    onClick={() => navigate("/admin/academics/quizzes")}
                    style={{ cursor: "pointer" }}
                    actions={[
                      <Tag
                        key="status"
                        color={q.status === "live" ? "green" : q.status === "review" ? "geekblue" : "default"}
                      >
                        {q.status || "draft"}
                      </Tag>,
                      <Text key="added" type="secondary">
                        Added: {fmtDate(q.created_at ?? q.createdAt)}
                      </Text>,
                    ]}
                  >
                    <div style={{ display: 'flex', width: '100%' }}>
                      <div style={{ marginRight: 16 }}>
                        <Avatar icon={<ExperimentOutlined />} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                        {q.title ? (
                          <div dangerouslySetInnerHTML={{ __html: q.title }} />
                        ) : q.description ? (
                          <div dangerouslySetInnerHTML={{ __html: q.description }} />
                        ) : (
                          "(Untitled quiz)"
                        )}
                      </div>
                      {q.description && q.title && q.title !== q.description && (
                        <div style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                          <div dangerouslySetInnerHTML={{ __html: q.description }} />
                        </div>
                      )}  
                        <div>
                          <Space size={[4, 8]} wrap>
                            {q.subject && <Tag>{q.subject}</Tag>}
                            {q.grade && <Tag color="blue">Grade {q.grade}</Tag>}
                            {q.bundesland && <Tag color="purple">{q.bundesland}</Tag>}
                            {q.difficulty && (
                              <Tag color={q.difficulty === "easy" ? "green" : q.difficulty === "hard" ? "volcano" : "geekblue"}>
                                {q.difficulty}
                              </Tag>
                            )}
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {fmtDate(q.created_at)}
                            </Text>
                          </Space>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* Scans Panel (placeholder; no scan route provided) */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24}>
            <Card
              hoverable
              title={<Space><FileTextOutlined /> Scans</Space>}
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
                  <Button type="primary" onClick={() => navigate("/admin/academics/ocr")}>
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
                    onClick={() => navigate("/admin/academics/ocr")}
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
        <Card className="mt-4 rounded-2xl" styles={{ body: { padding: screens.md ? 24 : 16 } }} hoverable>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Title level={4} className="!mb-1">Ready to build your next unit?</Title>
              <Text type="secondary">
                Start a curriculum, auto-generate quiz items with learning goals, and share with your team.
              </Text>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: screens.md ? "right" : "left" }}>
              <Space wrap>
                <Button onClick={() => navigate("/admin/academics/quizzes")}>Create Quiz</Button>
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
