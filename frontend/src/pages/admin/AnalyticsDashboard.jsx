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
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../api/axios";

const { Title, Text } = Typography;
const { Option } = Select;

const formatNumber = (num) =>
  Number(num).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("7");

  const fetchData = () => {
    setLoading(true);
    api
      .get("/analytics/dashboard", { params: { days: filter } })
      .then((res) => setData(res.data))
      .catch(() => message.error("Failed to load analytics dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleExport = (type, chartData, title = "Chart Export") => {
    if (!chartData?.length) return;

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.text(title, 10, 10);
      autoTable(doc, {
        startY: 20,
        head: [Object.keys(chartData[0])],
        body: chartData.map((d) => Object.values(d)),
      });
      doc.save(`${title}.pdf`);
    } else if (type === "csv") {
      const csvContent =
        Object.keys(chartData[0]).join(",") +
        "\n" +
        chartData.map((row) => Object.values(row).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.csv`;
      link.click();
    }
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const { stats, customerInsights, revenue, lineData, barData } = data;

  return (
    <div className="p-4 sm:p-6  dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <Title level={3}>📊 Analytics Dashboard</Title>
        <div className="flex gap-2">
          <Select defaultValue={filter} onChange={setFilter} style={{ width: 140 }}>
            <Option value="7">Last 7 days</Option>
            <Option value="30">Last 30 days</Option>
            <Option value="90">Last 90 days</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* 📦 Stats */}
      <Row gutter={[16, 16]}>
        {[
          { title: "Total Users", value: stats.totalUsers },
          { title: "Active Users", value: stats.activeUsers },
          { title: "New Users", value: stats.newUsers },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable className="transition-all shadow-sm" variant="outlined">
              <Text type="secondary">{item.title}</Text>
              <Title level={2}>{formatNumber(item.value)}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 👤 Insights */}
      <Row gutter={[16, 16]} className="mt-4">
        {[
          { title: "Satisfaction Rate", value: `${customerInsights.satisfaction}%` },
          { title: "Session Duration", value: `${customerInsights.sessionDuration} mins` },
          { title: "Retention Rate", value: `${customerInsights.retentionRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3}>{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 💰 Revenue */}
      <Row gutter={[16, 16]} className="mt-4">
        {[
          { title: "Total Revenue", value: `R ${formatNumber(revenue.total)}` },
          { title: "Subscriptions", value: formatNumber(revenue.subscriptions) },
          { title: "Renewal Rate", value: `${revenue.renewalRate}%` },
        ].map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <Card hoverable variant="outlined" className="transition-all shadow-sm">
              <Text type="secondary">{item.title}</Text>
              <Title level={3}>{item.value}</Title>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 📈 Charts */}
      <Row gutter={[16, 16]} className="mt-6">
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
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1890ff"
                  strokeWidth={2}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

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
            <ResponsiveContainer width="100%" height={250}>
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
    </div>
  );
}
