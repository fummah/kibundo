// src/pages/admin/academics/AcademicsOverview.jsx
import React, { useEffect, useMemo } from "react";
import { Result,
  Row, Col, Card, Typography, Space, Button, Tag, List, Avatar, Grid, Tooltip, Badge, Select
} from "antd";
import {
  ReadOutlined,
  BookOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios"; // your configured axios (adds baseURL, token, etc.)
import { message } from "antd";
import { listQuizzes } from "@/api/academics/quizzes.js";
import { useTopbar } from "@/components/layouts/GlobalLayout.jsx";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Reusable Dashboard Card Component
const DashboardCard = ({ title, value, icon, color, onClick }) => (
  <div
    className={`rounded-2xl p-6 text-white ${color} flex flex-col justify-between h-48 ${onClick ? "cursor-pointer transition-transform hover:scale-105" : ""}`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center">
        <div className="text-2xl bg-white/20 p-2 rounded-full mr-4">{icon}</div>
        <div>
          <div className="text-sm font-light opacity-80">{title}</div>
          <div className="text-4xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  </div>
);

/* Helpers */
function fmtDate(input) {
  if (!input) return "";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? String(input) : d.toLocaleString();
}
const safeLen = (v) => (Array.isArray(v) ? v.length : 0);

export default function AcademicsOverview() {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const topbar = useTopbar();
  const [messageApi, contextHolder] = message.useMessage();

  /* ---------------- Live data from your API ---------------- */
  const { 
    data: pageData,
    isLoading,
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ["academicsOverviewData"],
    queryFn: async () => {
      const [studentsRes, subjectsRes, quizzesRes, curriculaRes, homeworkScansRes] = await Promise.allSettled([
        api.get("/allstudents"),
        api.get("/allsubjects"),
        listQuizzes({ page: 1, pageSize: 50 }),
        api.get("/curiculums"),
        api.get("/homeworkscans").catch(() => ({ data: [] })) // Silently fail
      ]);

      const students = studentsRes.status === 'fulfilled' ? (studentsRes.value.data || []) : [];
      const subjects = subjectsRes.status === 'fulfilled' ? (subjectsRes.value.data || []) : [];
      const quizzes = quizzesRes.status === 'fulfilled' ? quizzesRes.value : { items: [], total: 0 };
      const curricula = curriculaRes.status === 'fulfilled' ? (curriculaRes.value.data?.items || curriculaRes.value.data || []) : [];
      // Handle homework scans - API returns array directly, axios wraps in .data
      let homeworkScans = [];
      if (homeworkScansRes.status === 'fulfilled') {
        const response = homeworkScansRes.value;
        if (Array.isArray(response?.data)) {
          homeworkScans = response.data;
        } else if (Array.isArray(response)) {
          homeworkScans = response;
        }
        console.log("📚 AcademicsOverview: Fetched homework scans:", homeworkScans.length);
      } else {
        console.warn("⚠️ AcademicsOverview: Failed to fetch homework scans:", homeworkScansRes.reason);
      }

      return { students, subjects, quizzes, curricula, homeworkScans };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const subjectsCount = safeLen(pageData?.subjects);
  const quizItems = Array.isArray(pageData?.quizzes?.items) ? pageData.quizzes.items : Array.isArray(pageData?.quizzes) ? pageData.quizzes : [];
  const quizzesTotal = Number.isFinite(pageData?.quizzes?.total) ? pageData.quizzes.total : quizItems.length;
  const curriculaItems = Array.isArray(pageData?.curricula) ? pageData.curricula : [];
  const curriculaCount = safeLen(curriculaItems);
  const homeworkScans = pageData?.homeworkScans || [];
  
  // Calculate completed and pending counts
  const completedScans = homeworkScans.filter(s => s.completed_at || s.completion_photo_url).length;
  const pendingScans = homeworkScans.length - completedScans;

  // Recent quizzes (newest first)
  const recentQuizzes = [...quizItems]
    .sort(
      (a, b) =>
        new Date(b?.created_at ?? b?.createdAt ?? 0) -
        new Date(a?.created_at ?? a?.createdAt ?? 0)
    )
    .slice(0, 5);

  // Recent curricula (by updated/created)
  const recentCurricula = [...curriculaItems]
    .sort((a, b) => {
      const bTime = new Date(b?.updated_at ?? b?.updatedAt ?? b?.created_at ?? b?.createdAt ?? 0).getTime();
      const aTime = new Date(a?.updated_at ?? a?.updatedAt ?? a?.created_at ?? a?.createdAt ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  // Recent homework scans (newest first)
  const recentScans = [...homeworkScans]
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
    .slice(0, 5);

  /* ---------------- KPIs ---------------- */
  const kpis = [
    { title: "Curricula", value: curriculaCount, icon: <ReadOutlined />,       gradient: "bg-gradient-to-br from-indigo-600 to-violet-600", onClick: () => navigate("/admin/academics/curricula") },
    { title: "Subjects",  value: subjectsCount,  icon: <ReadOutlined />,       gradient: "bg-gradient-to-br from-sky-500 to-cyan-500",    onClick: () => navigate("/admin/academics/subjects") },
    { title: "Quizzes",   value: quizzesTotal,   icon: <ExperimentOutlined />, gradient: "bg-gradient-to-br from-emerald-500 to-teal-500",  onClick: () => navigate("/admin/academics/quizzes") },
    { title: "Scans",     value: safeLen(homeworkScans), icon: <FileTextOutlined />,   gradient: "bg-gradient-to-br from-rose-500 to-orange-500",    onClick: () => navigate("/admin/scans/homework") },
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
      onRefresh: () => refetch(),
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

  /* ---------------- Static panels ---------------- */

  const recentActivity = useMemo(() => {
    const combined = [
      ...recentCurricula.map(item => ({ ...item, type: "curriculum" })),
      ...recentQuizzes.map(item => ({ ...item, type: "quiz" })),
      ...recentScans.map(item => ({ ...item, type: "scan" }))
    ];
    return combined
      .sort((a, b) => {
        const dateA = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const dateB = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [recentCurricula, recentQuizzes, recentScans]);

  return (
    <div className="p-4 md:p-6">
      {isError && (
        <Result
          status="error"
          title="Failed to Load Academics Data"
          subTitle={error.message}
          extra={<Button type="primary" onClick={() => refetch()}>Try Again</Button>}
          className="mb-6"
        />
      )}
      {/* Hero */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          Academics Overview
        </Title>
      </div>
        {contextHolder}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {kpis.map((k) => (
            <DashboardCard
              key={k.title}
              title={k.title}
              value={k.value}
              icon={k.icon}
              color={k.gradient}
              onClick={k.onClick}
            />
          ))}
        </div>
 

      {/* Content sections */}
      <div className="my-6 rounded-xl">
        <Row gutter={[24, 24]}>
          {/* Left Column: Key Capabilities */}
          <Col xs={24} lg={14}>
            <Card
              title={<Space><ThunderboltOutlined /> Key Capabilities</Space>}
              extra={<Button type="link" onClick={() => navigate("/admin/academics")} size="small">Open Academics <ArrowRightOutlined /></Button>}
              className="h-full"
            >
              <Row gutter={[16, 16]}>
                {features.map((f) => (
                  <Col key={f.title} xs={24} sm={12}>
                    <Card hoverable size="small" onClick={f.onClick} className="h-full">
                      <Space direction="vertical" size={8} className="w-full">
                        {f.icon}
                        <div className="font-semibold">{f.title}</div>
                        <Text type="secondary" className="text-xs">{f.desc}</Text>
                        <div className="flex items-center justify-between pt-2">
                          <Button type="link" className="!px-0 !text-xs">Open <ArrowRightOutlined /></Button>
                          {f.footer ? <div onClick={(e) => e.stopPropagation()}>{f.footer}</div> : null}
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          {/* Right Column: Recent Activity */}
          <Col xs={24} lg={10}>
            <Card title="Recent Activity" extra={<Button type="link" size="small">View All</Button>}>
              <List
                itemLayout="horizontal"
                dataSource={recentActivity}
                locale={{ emptyText: "No recent activity" }}
                renderItem={(item) => {
                  const icons = {
                    curriculum: <ReadOutlined />,
                    quiz: <ExperimentOutlined />,
                    scan: <FileTextOutlined />,
                  };
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={icons[item.type]} />}
                        title={<span className="font-medium">{item.title || item.description || "New Item"}</span>}
                        description={
                          <Space size="small">
                            <Tag>{item.type}</Tag>
                            <Text type="secondary">• {fmtDate(item.updated_at || item.created_at)}</Text>
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

        {/* Recent Curricula */}
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
                loading={isLoading}
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

        {/* Recent Quizzes */}
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
                loading={isLoading}
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
                        Added: {fmtDate(q?.created_at ?? q?.createdAt)}
                      </Text>,
                    ]}
                  >
                    <div style={{ display: "flex", width: "100%" }}>
                      <div style={{ marginRight: 16 }}>
                        <Avatar icon={<ExperimentOutlined />} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                          {q?.title ? (
                            <div dangerouslySetInnerHTML={{ __html: q.title }} />
                          ) : q?.description ? (
                            <div dangerouslySetInnerHTML={{ __html: q.description }} />
                          ) : (
                            "(Untitled quiz)"
                          )}
                        </div>
                        {q?.description && q?.title && q.title !== q.description && (
                          <div style={{ fontSize: 14, color: "#666", marginTop: 2 }}>
                            <div dangerouslySetInnerHTML={{ __html: q.description }} />
                          </div>
                        )}
                        <div>
                          <Space size={[4, 8]} wrap>
                            {q?.subject && <Tag>{q.subject}</Tag>}
                            {q?.grade && <Tag color="blue">Grade {q.grade}</Tag>}
                            {q?.bundesland && <Tag color="purple">{q.bundesland}</Tag>}
                            {q?.difficulty && (
                              <Tag color={q.difficulty === "easy" ? "green" : q.difficulty === "hard" ? "volcano" : "geekblue"}>
                                {q.difficulty}
                              </Tag>
                            )}
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              {fmtDate(q?.created_at ?? q?.createdAt)}
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

        {/* Scans Panel */}
        <Row gutter={[16, 16]} className="mt-2">
          <Col xs={24}>
            <Card
              hoverable
              title={<Space><FileTextOutlined /> Scans</Space>}
              extra={
                <Button type="primary" onClick={() => navigate("/admin/scans/homework")}>
                  Open Homework Scans
                </Button>
              }
            >
              <div className="mb-4">
                <Space size="large">
                  <div>
                    <Text type="secondary">Total</Text>
                    <div className="text-2xl font-bold">{homeworkScans.length}</div>
                  </div>
                  <div>
                    <Text type="secondary">Completed</Text>
                    <div className="text-2xl font-bold text-green-600">{completedScans}</div>
                  </div>
                  <div>
                    <Text type="secondary">Pending</Text>
                    <div className="text-2xl font-bold text-orange-600">{pendingScans}</div>
                  </div>
                </Space>
              </div>
              <List
                loading={isLoading}
                dataSource={recentScans}
                locale={{ emptyText: "No scans yet" }}
                renderItem={(s) => {
                  const isCompleted = s.completed_at || s.completion_photo_url;
                  const studentName = s.student?.user 
                    ? [s.student.user.first_name, s.student.user.last_name].filter(Boolean).join(" ").trim() || s.student.user.name || "-"
                    : "-";
                  return (
                    <List.Item
                      actions={[
                        <Tag key="status" color={isCompleted ? "green" : "orange"}>
                          {isCompleted ? "Completed" : "Pending"}
                        </Tag>,
                      ]}
                      onClick={() => navigate(`/admin/scans/homework/${s.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<FileTextOutlined />} />}
                        title={
                          <span className="font-medium">
                            {s.detected_subject || "Homework Scan"} - {studentName}
                          </span>
                        }
                        description={
                          <Space size="small" wrap>
                            {s.detected_subject && <Tag color="blue">{s.detected_subject}</Tag>}
                            {s.task_type && <Tag>{s.task_type}</Tag>}
                            <Text type="secondary">
                              <ClockCircleOutlined /> {fmtDate(s.created_at)}
                            </Text>
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

        {/* CTA */}
        <Card
          className="mt-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 border-0"
          styles={{ body: { padding: screens.md ? 24 : 16 } }}
          hoverable
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Space align="start">
                <Avatar
                  size="large"
                  icon={<RocketOutlined />}
                  className="bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400"
                />
                <div>
                  <Title level={4} className="!mb-1">Ready to build your next unit?</Title>
                  <Text type="secondary">
                    Start a curriculum, auto-generate quiz items with learning goals, and share with your team.
                  </Text>
                </div>
              </Space>
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
