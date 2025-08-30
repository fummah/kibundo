// src/pages/admin/AnalyticsDashboard.jsx
import { useEffect, useState } from "react";
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
} from "antd";
import {
  DownloadOutlined,
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

const { Title, Text } = Typography;
const { Option } = Select;

const formatNumber = (num) =>
  Number(num ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const DEVICE_COLORS = ["#1677ff", "#52c41a", "#faad14"]; // desktop, mobile, tablet

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null); // ⬅️ from /admin/dashboard (parents + students)
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("7");

  const fetchData = () => {
    setLoading(true);
    Promise.allSettled([
      api.get("/analytics/dashboard", { params: { days: filter } }),
      api.get("/admin/dashboard"),
    ])
      .then(([analyticsRes, overviewRes]) => {
        if (analyticsRes.status === "fulfilled") {
          setData(analyticsRes.value.data);
        } else {
          message.error("Failed to load analytics dashboard");
        }

        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value.data?.overview ?? null);
        } else {
          // Don't error hard; analytics can still render
          setOverview(null);
        }
      })
      .catch(() => {
        message.error("Failed to load analytics/overview data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [filter]);

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

    // csv
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

  // ---------- Safe reads + fallbacks ----------
  const statsRaw = data?.stats ?? { totalUsers: 0, activeUsers: 0, newUsers: 0 };

  // ⬇️ Force the same Total Users logic as Admin Dashboard: parents + students
  const parentsCount = Number(overview?.parents ?? 0);
  const studentsCount = Number(overview?.students ?? 0);
  const totalUsersFromAdmin = parentsCount + studentsCount;

  const stats = {
    ...statsRaw,
    totalUsers:
      Number.isFinite(totalUsersFromAdmin) && (parentsCount || studentsCount)
        ? totalUsersFromAdmin
        : Number(statsRaw.totalUsers ?? 0),
  };

  const trials = data?.trials ?? {
    inTrial: 0,
    endingToday: 0,
    endingTomorrow: 0,
    usersInTrial: [],        // [{id,email,name,state,grade,ends_at}]
    usersEndingToday: [],    // same shape
  };

  const customerInsights = data?.customerInsights ?? {
    satisfaction: 0,
    sessionDuration: 0,
    retentionRate: 0,
  };

  const revenue = data?.revenue ?? {
    total: 0,
    subscriptions: 0,
    renewalRate: 0,
  };

  const lineData = Array.isArray(data?.lineData) ? data.lineData : [];
  const barData = Array.isArray(data?.barData) ? data.barData : [];

  const deviceUsageRaw = data?.deviceUsage ?? {};
  const deviceUsage = [
    { name: "Desktop", value: Number(deviceUsageRaw.desktop ?? 0) },
    { name: "Mobile",  value: Number(deviceUsageRaw.mobile ?? 0) },
    { name: "Tablet",  value: Number(deviceUsageRaw.tablet ?? 0) },
  ];

  const trialCols = [
    { title: "User", dataIndex: "name", key: "name", render: (v, r) => v || r.email || "-" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "State", dataIndex: "state", key: "state", width: 90, render: v => v || "—" },
    { title: "Grade", dataIndex: "grade", key: "grade", width: 90, render: v => v ?? "—" },
    {
      title: "Ends",
      dataIndex: "ends_at",
      key: "ends_at",
      width: 180,
      render: v => (v ? new Date(v).toLocaleString() : "—"),
    },
  ];

  const usersInTrial = Array.isArray(trials.usersInTrial) ? trials.usersInTrial : [];
  const usersEndingToday = Array.isArray(trials.usersEndingToday) ? trials.usersEndingToday : [];

  return (
    <div className="p-4 sm:p-6 dark:bg-gray-900 min-h-screen max-w-[1600px] mx-auto">
      {/* Header */}
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

      {/* Core Stats */}
      <Row gutter={[16, 16]}>
        {[
          { title: "Total Users", value: stats.totalUsers },
          { title: "Active Users", value: stats.activeUsers },
          { title: "New Users", value: stats.newUsers },
        ].map((item, idx) => (
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
          { title: "Satisfaction Rate", value: `${customerInsights.satisfaction ?? 0}%` },
          { title: "Session Duration", value: `${customerInsights.sessionDuration ?? 0} mins` },
          { title: "Retention Rate", value: `${customerInsights.retentionRate ?? 0}%` },
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
          { title: "Renewal Rate", value: `${revenue.renewalRate ?? 0}%` },
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
                <Button size="small" onClick={() => handleExport("pdf", lineData, "User Growth")}>PDF</Button>
                <Button size="small" onClick={() => handleExport("csv", lineData, "User Growth")}>CSV</Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={2} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
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
                <Button size="small" onClick={() => handleExport("pdf", barData, "Quarterly Revenue")}>PDF</Button>
                <Button size="small" onClick={() => handleExport("csv", barData, "Quarterly Revenue")}>CSV</Button>
              </Space>
            }
            className="transition-all shadow-sm"
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <XAxis dataKey="label" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#52c41a" barSize={40} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
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
                      deviceUsage.map(d => ({ device: d.name, share: d.value })),
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
                      deviceUsage.map(d => ({ device: d.name, share: d.value })),
                      "Device Usage"
                    )
                  }
                >
                  PDF
                </Button>
              </Space>
            }
          >
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
                      (usersInTrial ?? []).map(u => ({
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
                      (usersInTrial ?? []).map(u => ({
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
                      (usersEndingToday ?? []).map(u => ({
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
                      (usersEndingToday ?? []).map(u => ({
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
