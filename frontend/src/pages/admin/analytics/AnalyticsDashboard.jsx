// src/pages/admin/AnalyticsDashboard.jsx
import { useEffect, useRef, useState } from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Select,
  Spin,
  Button,
  Space,
  message,
  Table,
  Tag,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

const { Title, Text } = Typography;
const { Option } = Select;

const DEVICE_COLORS = ["#1677ff", "#52c41a", "#faad14"];

const clampNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const formatNumber = (num) =>
  Number(clampNum(num)).toLocaleString("en-US", { maximumFractionDigits: 0 });

// Fetch total users same way as AdminDashboard
async function getJson(path, token) {
  try {
    const { data } = await api.get(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: true,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

async function fetchDashboardBundle(token) {
  const [overview, parents, students] = await Promise.all([
    getJson("/admin/dashboard", token),
    getJson("/parents", token),
    getJson("/allstudents", token),
  ]);

  const len = (x) => (Array.isArray(x) ? x.length : 0);

  return {
    overview,
    counts: {
      parents: len(parents),
      students: len(students),
    },
  };
}

function adaptAnalyticsPayload(payload = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n > 1 ? n : Math.round(n * 100);
  };
  const toRand = (v) => {
    const n = Number(v) || 0;
    return n > 1000 ? n / 100 : n; // cents heuristic
  };

  const stats = {
    totalUsers: num(payload?.stats?.totalUsers ?? payload?.stats?.total_users ?? payload?.stats?.total ?? 0),
    activeUsers: num(payload?.stats?.activeUsers ?? payload?.stats?.active_users ?? payload?.stats?.active ?? 0),
    newUsers: num(payload?.stats?.newUsers ?? payload?.stats?.new_users ?? payload?.stats?.new ?? 0),
  };

  const t = payload.trials ?? {};
  const trials = {
    inTrial: num(t.inTrial ?? t.in_trial ?? t.count ?? 0),
    endingToday: num(t.endingToday ?? t.ending_today ?? t.ends_today ?? 0),
    endingTomorrow: num(t.endingTomorrow ?? t.ending_tomorrow ?? t.ends_tomorrow ?? 0),
    usersInTrial: Array.isArray(t.usersInTrial ?? t.users_in_trial) ? (t.usersInTrial ?? t.users_in_trial) : [],
    usersEndingToday: Array.isArray(t.usersEndingToday ?? t.users_ending_today) ? (t.usersEndingToday ?? t.users_ending_today) : [],
  };

  const ci = payload.customerInsights ?? payload.customer_insights ?? {};
  const customerInsights = {
    satisfaction: pct(ci.satisfaction ?? ci.satisfaction_pct ?? ci.csat ?? 0),
    sessionDuration: num(ci.sessionDuration ?? ci.session_duration ?? ci.avg_session_mins ?? 0),
    retentionRate: pct(ci.retentionRate ?? ci.retention_rate_pct ?? ci.retention ?? 0),
  };

  const r = payload.revenue ?? {};
  const revenue = {
    total: toRand(r.total_cents ?? r.total ?? r.revenue_cents ?? r.revenue ?? 0),
    subscriptions: num(r.subscriptions ?? r.active_subscriptions ?? r.subs ?? 0),
    renewalRate: pct(r.renewalRate ?? r.renewal_rate_pct ?? r.renewal ?? 0),
    currency: (r.currency || "ZAR").toUpperCase(),
  };

  const lineRaw = payload.series?.user_growth ?? payload.series?.userGrowth ?? payload.series?.users ?? payload.lineData ?? [];
  const lineData = (Array.isArray(lineRaw) ? lineRaw : []).map((p) => ({
    date: String(p.date ?? p.day ?? p.label ?? ""),
    value: num(p.value ?? p.count ?? p.total ?? 0),
  }));

  const barRaw = payload.series?.quarterly_revenue ?? payload.series?.revenue ?? payload.barData ?? payload.quarters ?? [];
  const barData = (Array.isArray(barRaw) ? barRaw : []).map((p) => ({
    label: String(p.label ?? p.quarter ?? p.period ?? ""),
    value: toRand(p.value_cents ?? p.value ?? p.amount_cents ?? p.amount ?? 0),
  }));

  const dev = payload.deviceUsage ?? payload.devices ?? {};
  const desktop = num(dev.desktop ?? dev.web ?? dev.pc ?? 0);
  const mobile  = num(dev.mobile  ?? dev.phone ?? 0);
  const tablet  = num(dev.tablet  ?? dev.tab   ?? 0);
  const sum = desktop + mobile + tablet;
  const looksLikeShare = [desktop, mobile, tablet].every((v) => v <= 1);

  const deviceUsage = looksLikeShare
    ? [
        { name: "Desktop", value: desktop },
        { name: "Mobile",  value: mobile  },
        { name: "Tablet",  value: tablet  },
      ]
    : sum > 0
      ? [
          { name: "Desktop", value: desktop / sum },
          { name: "Mobile",  value: mobile  / sum },
          { name: "Tablet",  value: tablet  / sum },
        ]
      : [];

  return { stats, trials, customerInsights, revenue, lineData, barData, deviceUsage };
}


export default function AnalyticsDashboard() {
  const { user } = useAuthContext();
  const token = user?.token;

  const [data, setData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("7");

  const refreshRef = useRef(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, overviewRes] = await Promise.allSettled([
        api.get("/analytics/dashboard", {
          params: { days: filter },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true,
        }),
        fetchDashboardBundle(token),
      ]);

      if (analyticsRes.status === "fulfilled") {
        const payload = analyticsRes.value?.data ?? {};
        const adapted = adaptAnalyticsPayload(payload);
        setData(adapted);
      } else {
        message.error("Failed to load analytics dashboard");
      }

      if (overviewRes.status === "fulfilled") {
        setOverviewData(overviewRes.value);
      } else {
        setOverviewData(null);
      }
    } catch (e) {
      message.error("Failed to load analytics/overview data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!refreshRef.current) fetchData();
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const handleExport = (type, rows, title = "Export") => {
    if (!rows?.length) return;
    const head = Object.keys(rows[0] ?? {});

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.text(title, 10, 12);
      autoTable(doc, {
        startY: 18,
        head: [head],
        body: rows.map((d) => head.map((k) => String(d?.[k] ?? ""))),
      });
      doc.save(`${title}.pdf`);
      return;
    }

    const csvContent = [
      head.join(","),
      ...rows.map((r) => head.map((k) => String(r?.[k] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.csv`;
    link.click();
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const statsRaw = data?.stats ?? { totalUsers: 0, activeUsers: 0, newUsers: 0 };

  const parentsCount = clampNum(overviewData?.counts?.parents ?? 0);
  const studentsCount = clampNum(overviewData?.counts?.students ?? 0);
  const totalUsersFromAdmin = parentsCount + studentsCount;

  const stats = {
    ...statsRaw,
    totalUsers:
      Number.isFinite(totalUsersFromAdmin) && (parentsCount || studentsCount)
        ? totalUsersFromAdmin
        : clampNum(statsRaw.totalUsers ?? 0),
  };

  const trials = data?.trials ?? { inTrial: 0, endingToday: 0, endingTomorrow: 0, usersInTrial: [], usersEndingToday: [] };

  const customerInsights = data?.customerInsights ?? { satisfaction: 0, sessionDuration: 0, retentionRate: 0 };

  const revenue = data?.revenue ?? { total: 0, subscriptions: 0, renewalRate: 0 };

  const lineData = Array.isArray(data?.lineData) ? data.lineData : [];
  const barData = Array.isArray(data?.barData) ? data.barData : [];

  const deviceUsage = Array.isArray(data?.deviceUsage)
    ? data.deviceUsage
    : data.deviceUsage;

  const trialCols = [
    { title: "User", dataIndex: "name", key: "name", render: (v, r) => v || r.email || "-" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "State", dataIndex: "state", key: "state", width: 90, render: v => v || "—" },
    { title: "Grade", dataIndex: "grade", key: "grade", width: 90, render: v => v ?? "—" },
    { title: "Ends", dataIndex: "ends_at", key: "ends_at", width: 180, render: v => (v ? new Date(v).toLocaleString() : "—") },
  ];

  const usersInTrial = Array.isArray(trials.usersInTrial) ? trials.usersInTrial : [];
  const usersEndingToday = Array.isArray(trials.usersEndingToday) ? trials.usersEndingToday : [];

  return (
    <div className="p-4 sm:p-6 dark:bg-gray-900 min-h-screen max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <Title level={3} className="!mb-0">📊 Analytics Dashboard</Title>
        <div className="flex gap-2">
          <Select defaultValue={filter} onChange={setFilter} style={{ width: 160 }}>
            <Option value="7">Last 7 days</Option>
            <Option value="30">Last 30 days</Option>
            <Option value="90">Last 90 days</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        {[{ title: "Total Users", value: stats.totalUsers }, { title: "Active Users", value: stats.activeUsers }, { title: "New Users", value: stats.newUsers }].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable className="transition-all shadow-sm" variant="outlined">
              <Text type="secondary">{item.title}</Text>
              <Title level={2} className="!mb-0">{formatNumber(item.value)}</Title>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Trial KPIs */}
      <Row gutter={[16, 16]} className="mt-2">
        {[
          { title: "Users in Free Trial", value: trials.inTrial, color: "blue" },
          { title: "Trials Ending Today", value: trials.endingToday, color: "gold" },
          { title: "Trials Ending Tomorrow", value: trials.endingTomorrow, color: "purple" },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Space direction="vertical" size={2}>
                <Text type="secondary">{item.title}</Text>
                <Title level={3} className="!mb-0">
                  <Tag color={item.color} style={{ fontSize: 16, padding: "2px 8px" }}>
                    {formatNumber(item.value)}
                  </Tag>
                </Title>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Customer Insights + Revenue */}
      <Row gutter={[16, 16]} className="mt-4">
        {[
          { title: "Satisfaction Rate", value: `${customerInsights.satisfaction}%` },
          { title: "Session Duration", value: `${customerInsights.sessionDuration} mins` },
          { title: "Retention Rate", value: `${customerInsights.retentionRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3} className="!mb-0">{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="mt-2">
        {[
          { title: "Total Revenue", value: `R ${formatNumber(revenue.total)}` },
          { title: "Subscriptions", value: formatNumber(revenue.subscriptions) },
          { title: "Renewal Rate", value: `${revenue.renewalRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3} className="!mb-0">{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mt-6">
        {/* Line: User Growth */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title={
              <Space>
                <LineChartOutlined /> User Growth
                <Button size="small" onClick={() => handleExport("pdf", lineData, "User Growth")}>
                  PDF
                </Button>
                <Button size="small" onClick={() => handleExport("csv", lineData, "User Growth")}>
                  CSV
                </Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            {lineData?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={2} isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data" />
            )}
          </Card>
        </Col>

        {/* Bar: Quarterly Revenue */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title={
              <Space>
                <BarChartOutlined /> Quarterly Revenue
                <Button size="small" onClick={() => handleExport("pdf", barData, "Quarterly Revenue")}>
                  PDF
                </Button>
                <Button size="small" onClick={() => handleExport("csv", barData, "Quarterly Revenue")}>
                  CSV
                </Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            {barData?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#52c41a" barSize={40} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Device Usage (includes Tablets) */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title="Device Usage"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "csv",
                      deviceUsage.map((d) => ({ device: d.name, share: d.value })),
                      "Device Usage"
                    )
                  }
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "pdf",
                      deviceUsage.map((d) => ({ device: d.name, share: d.value })),
                      "Device Usage"
                    )
                  }
                >
                  PDF
                </Button>
              </Space>
            }
          >
            {deviceUsage?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={deviceUsage}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    label={(d) => `${d.name}: ${(d.value * 100).toFixed(0)}%`}
                  >
                    {deviceUsage.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data" />
            )}
          </Card>
        </Col>

        {/* Trial Lists */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            variant="outlined"
            title="Users in Free Trial"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "csv",
                      (usersInTrial ?? []).map((u) => ({
                        name: u.name ?? "",
                        email: u.email ?? "",
                        state: u.state ?? "",
                        grade: u.grade ?? "",
                        ends_at: u.ends_at ?? "",
                      })),
                      "Users in Free Trial"
                    )
                  }
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "pdf",
                      (usersInTrial ?? []).map((u) => ({
                        name: u.name ?? "",
                        email: u.email ?? "",
                        state: u.state ?? "",
                        grade: u.grade ?? "",
                        ends_at: u.ends_at ?? "",
                      })),
                      "Users in Free Trial"
                    )
                  }
                >
                  PDF
                </Button>
              </Space>
            }
            className="mb-4"
          >
            <Table
              rowKey={(r) => r.id ?? r.email}
              columns={trialCols}
              dataSource={usersInTrial}
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>

          <Card
            hoverable
            variant="outlined"
            title="Trials Ending Today"
            extra={
              <Space>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "csv",
                      (usersEndingToday ?? []).map((u) => ({
                        name: u.name ?? "",
                        email: u.email ?? "",
                        state: u.state ?? "",
                        grade: u.grade ?? "",
                        ends_at: u.ends_at ?? "",
                      })),
                      "Trials Ending Today"
                    )
                  }
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    handleExport(
                      "pdf",
                      (usersEndingToday ?? []).map((u) => ({
                        name: u.name ?? "",
                        email: u.email ?? "",
                        state: u.state ?? "",
                        grade: u.grade ?? "",
                        ends_at: u.ends_at ?? "",
                      })),
                      "Trials Ending Today"
                    )
                  }
                >
                  PDF
                </Button>
              </Space>
            }
          >
            <Table
              rowKey={(r) => r.id ?? r.email}
              columns={trialCols}
              dataSource={usersEndingToday}
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
