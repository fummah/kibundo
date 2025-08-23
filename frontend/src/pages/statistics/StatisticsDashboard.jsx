import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  Tabs,
  Typography,
  Card,
  Button,
  Row,
  Col,
  Table,
  Space,
  Tooltip,
  message,
  Input,
  Spin,
  Empty,
  Tag,
} from "antd";

import {
  UserOutlined,
  DollarOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  RiseOutlined,
  LineChartOutlined,
} from "@ant-design/icons";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const { Title, Text } = Typography;

const tabItems = [
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "90", label: "Last 90 Days" },
];

// util
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
};

export default function StatisticsDashboard() {
  const [activeTab, setActiveTab] = useState("30");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/statistics/dashboard", { params: { days: activeTab } });
      const payload = res?.data?.data ?? res?.data ?? {};
      const { chartData, stats, insights, subscriptions } = payload;
      setChartData(Array.isArray(chartData) ? chartData : []);
      setStats(stats || {});
      setInsights(insights || {});
      setSubscriptions((Array.isArray(subscriptions) ? subscriptions : []).map((item, i) => ({
        key: i.toString(),
        ...item,
      })));
    } catch (err) {
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when tab (days) changes
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // gentle auto-refresh
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleRefresh = () => {
    message.success("Dashboard refreshed");
    fetchData();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById("export-section");
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("dashboard-report.pdf");
    message.success("PDF downloaded");
  };

  const handleExportCSV = () => {
    // export subscriptions table as CSV
    if (!subscriptions.length) return message.info("Nothing to export yet.");
    const rows = subscriptions.map(({ key, ...r }) => r);
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "subscriptions.csv";
    link.click();
  };

  const filteredSubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((s) =>
      `${s.package} ${s.total} ${s.active} ${s.renewal}`.toLowerCase().includes(q)
    );
  }, [subscriptions, search]);

  const columns = [
    {
      title: "Package",
      dataIndex: "package",
      filters: [
        { text: "Basic", value: "Basic" },
        { text: "Premium", value: "Premium" },
        { text: "Enterprise", value: "Enterprise" },
      ],
      onFilter: (value, record) => String(record.package || "").includes(value),
    },
    { title: "Total", dataIndex: "total", width: 120 },
    { title: "Active", dataIndex: "active", width: 120 },
    {
      title: "Renewal Rate",
      dataIndex: "renewal",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
  ];

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-[1600px] mx-auto">
      <Row justify="space-between" align="middle" gutter={[8, 8]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Title level={3} className="!mb-0">
              <BarChartOutlined style={{ marginRight: 8 }} />
              Statistics Dashboard
            </Title>
            <Text type="secondary">Track key metrics and insights.</Text>
          </Space>
        </Col>
        <Col>
          <Space wrap>
            <Input
              allowClear
              placeholder="Search subscriptions…"
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
            <Tooltip title="Refresh">
              <Button shape="circle" icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
            <Tooltip title="Export page to PDF">
              <Button shape="circle" icon={<DownloadOutlined />} onClick={handleExportPDF} />
            </Tooltip>
            <Tooltip title="Export subscriptions CSV">
              <Button shape="circle" icon={<DollarOutlined />} onClick={handleExportCSV} />
            </Tooltip>
          </Space>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          const label = tabItems.find((t) => t.key === key)?.label ?? key;
          message.success(`Showing: ${label}`);
        }}
        items={tabItems}
        className="my-4"
      />

      <div id="export-section">
        {/* KPI Tiles */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card hoverable>
              <Space>
                <UserOutlined style={{ fontSize: 20, color: "#1677ff" }} />
                <Text>Total Users</Text>
              </Space>
              <Title level={2} className="!mb-0">{stats.totalUsers ?? 0}</Title>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card hoverable>
              <Space>
                <DollarOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                <Text>Active Subscriptions</Text>
              </Space>
              <Title level={2} className="!mb-0">{stats.activeSubscriptions ?? 0}</Title>
            </Card>
          </Col>
        </Row>

        {/* Insight Cards */}
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} sm={8}>
            <Card title="B2B vs B2C" hoverable>
              <Text>{insights?.b2bB2c || "—"}</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Device Usage" hoverable>
              <Text>
                {Object.entries(insights?.deviceUsage || {})
                  .map(([k, v]) => `${k}: ${v}%`)
                  .join(" | ") || "—"}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Engagement" hoverable>
              <Text>
                {Object.entries(insights?.engagement || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" | ") || "—"}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Title level={4} className="mt-6">Revenue & Subscription Analytics</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Revenue by Package" extra={<RiseOutlined />} hoverable>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Revenue by Marketplace" extra={<LineChartOutlined />} hoverable>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="value" stroke="#52c41a" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Revenue by Client Type" extra={<DollarOutlined />} hoverable>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#faad14" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Subscriptions Table */}
        <Title level={4} className="mt-6">Subscription Details</Title>
        <Card>
          <Table
            columns={columns}
            dataSource={filteredSubs}
            pagination={{ pageSize: 8, showSizeChanger: true }}
            bordered
            scroll={{ x: true }}
            locale={{
              emptyText: (
                <Empty description="No subscription data">
                  <Button onClick={handleRefresh} icon={<ReloadOutlined />}>Reload</Button>
                </Empty>
              ),
            }}
          />
        </Card>
      </div>
    </div>
  );
}
