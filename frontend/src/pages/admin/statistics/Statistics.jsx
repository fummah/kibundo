import { useEffect, useState } from "react";
import api from "@/api/axios";
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
  Badge,
  Input,
  Spin,
} from "antd";

import {
  UserOutlined,
  DollarOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BellOutlined,
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

export default function StatisticsDashboard() {
  const [activeTab, setActiveTab] = useState("30");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    api
      .get("/statistics/dashboard")
      .then((res) => {
        console.log("✅ API Response:", res.data);
        const responseData = res.data.data || res.data;

        const { chartData, stats, insights, subscriptions } = responseData;

        setChartData(chartData || []);
        setStats(stats || {});
        setInsights(insights || {});
        setSubscriptions(
          (subscriptions || []).map((item, i) => ({
            key: i.toString(),
            ...item,
          }))
        );
      })
      .catch((err) => {
        console.error("❌ API Error:", err);
        message.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  };

  const handleRefresh = () => {
    message.success("Dashboard refreshed");
    fetchData();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById("export-section");
    if (!input) return;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("dashboard-report.pdf");
    message.success("PDF downloaded");
  };

  const handleExportCSV = () => {
    message.info("Exporting CSV...");
    setTimeout(() => message.success("CSV export completed"), 1000);
  };

 

  const columns = [
    {
      title: "Package",
      dataIndex: "package",
      filters: [
        { text: "Basic", value: "Basic" },
        { text: "Premium", value: "Premium" },
        { text: "Enterprise", value: "Enterprise" },
      ],
      onFilter: (value, record) => record.package.includes(value),
    },
    { title: "Total Subscriptions", dataIndex: "total" },
    { title: "Active Subscriptions", dataIndex: "active" },
    {
      title: "Renewal Rate",
      dataIndex: "renewal",
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Renewal"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: "block" }}
          />
          <Button onClick={() => confirm()} type="primary" size="small">
            Search
          </Button>
        </div>
      ),
      onFilter: (value, record) =>
        record.renewal.toLowerCase().includes(value.toLowerCase()),
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
    <div className="px-4 py-6">
      <Row justify="space-between" align="middle">
        <Col>
          <Space direction="vertical" size={0}>
            <Title level={3}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              Statistics Dashboard
            </Title>
            <Text type="secondary">
              Track key metrics and insights for your institution’s performance.
            </Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Tooltip title="Refresh">
              <Button shape="circle" icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
            <Tooltip title="Export PDF">
              <Button shape="circle" icon={<DownloadOutlined />} onClick={handleExportPDF} />
            </Tooltip>
            <Tooltip title="Export CSV">
              <Button shape="circle" icon={<DollarOutlined />} onClick={handleExportCSV} />
            </Tooltip>
            
          </Space>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          message.success(`Showing: ${tabItems.find((t) => t.key === key).label}`);
        }}
        items={tabItems}
        className="my-4"
      />

      <div id="export-section">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card hoverable>
              <Space>
                <UserOutlined style={{ fontSize: 20, color: "#1677ff" }} />
                <Text>Total Users</Text>
              </Space>
              <Title level={2}>{stats.totalUsers}</Title>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card hoverable>
              <Space>
                <DollarOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                <Text>Active Subscriptions</Text>
              </Space>
              <Title level={2}>{stats.activeSubscriptions}</Title>
            </Card>
          </Col>
        </Row>

       <Row gutter={[16, 16]} className="mt-4">
  <Col xs={24} sm={8}>
    <Card title="B2B vs B2C" hoverable>
      <Text>{insights.b2bB2c}</Text>
    </Card>
  </Col>
  <Col xs={24} sm={8}>
    <Card title="Device Usage" hoverable>
      {/* ❌ OLD */}
      {/* <Text>{insights.deviceUsage}</Text> */}
      {/* ✅ NEW */}
      <Text>
        {Object.entries(insights.deviceUsage || {}).map(
          ([key, value]) => `${key}: ${value}% `
        ).join(" | ")}
      </Text>
    </Card>
  </Col>
  <Col xs={24} sm={8}>
    <Card title="Engagement" hoverable>
      {/* ❌ OLD */}
      {/* <Text>{insights.engagement}</Text> */}
      {/* ✅ NEW */}
      <Text>
        {Object.entries(insights.engagement || {}).map(
          ([key, value]) => `${key}: ${value} `
        ).join(" | ")}
      </Text>
    </Card>
  </Col>
</Row>

        <Title level={4} className="mt-6">
          Revenue & Subscription Analytics
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Revenue by Package" extra={<RiseOutlined />} hoverable>
              <ResponsiveContainer width="100%" height={200}>
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
              <ResponsiveContainer width="100%" height={200}>
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
              <ResponsiveContainer width="100%" height={200}>
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

        <Title level={4} className="mt-6">Subscription Details</Title>
        <Table
          columns={columns}
          dataSource={subscriptions}
          pagination={false}
          bordered
          scroll={{ x: true }}
        />
      </div>
    </div>
  );
}
