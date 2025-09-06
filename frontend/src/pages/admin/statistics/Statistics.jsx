import { useEffect, useState, useMemo } from "react";
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
  Input,
  Spin,
  Empty,
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
  CartesianGrid,
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

  // CHANGED: chartData is now an object with 3 series
  const [chartData, setChartData] = useState({
    byPackage: [],
    byMarketplace: [],
    byClientType: [],
  });

  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);

  const numberFmt = useMemo(() => new Intl.NumberFormat(), []);

  useEffect(() => {
    fetchData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = (rangeKey = "30") => {
    setLoading(true);
    api
      .get("/statistics/dashboard", { params: { range: rangeKey } })
      .then((res) => {
        const responseData = res?.data?.data || res?.data || {};
        const {
          chartData: cd,
          stats: st,
          insights: ins,
          subscriptions: subs,
        } = responseData;

        setChartData({
          byPackage: cd?.byPackage ?? [],
          byMarketplace: cd?.byMarketplace ?? [],
          byClientType: cd?.byClientType ?? [],
        });

        setStats(st || {});
        setInsights(ins || {});
        setSubscriptions(
          (subs || []).map((item, i) => ({
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
    fetchData(activeTab);
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
    // Keeping your stub — you can wire a real CSV from subscriptions or stats later
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
      onFilter: (value, record) => (record.package || "").includes(value),
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
        String(record.renewal || "").toLowerCase().includes(String(value).toLowerCase()),
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
          const label = tabItems.find((t) => t.key === key)?.label || key;
          message.success(`Showing: ${label}`);
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
              <Title level={2}>{numberFmt.format(stats.totalUsers ?? 0)}</Title>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card hoverable>
              <Space>
                <DollarOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                <Text>Active Subscriptions</Text>
              </Space>
              <Title level={2}>
                {numberFmt.format(stats.activeSubscriptions ?? 0)}
              </Title>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} sm={8}>
            <Card title="B2B vs B2C" hoverable>
              <Text>{insights.b2bB2c || "—"}</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Device Usage" hoverable>
              <Text>
                {Object.entries(insights.deviceUsage || {}).map(
                  ([key, value]) => `${key}: ${value}% `
                ).join(" | ") || "—"}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Engagement" hoverable>
              <Text>
                {Object.entries(insights.engagement || {}).map(
                  ([key, value]) => `${key}: ${value} `
                ).join(" | ") || "—"}
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
              {chartData.byPackage.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData.byPackage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Revenue by Marketplace" extra={<LineChartOutlined />} hoverable>
              {chartData.byMarketplace.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.byMarketplace}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Revenue by Client Type" extra={<DollarOutlined />} hoverable>
              {chartData.byClientType.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData.byClientType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
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
          locale={{ emptyText: <Empty /> }}
        />
      </div>
    </div>
  );
}
