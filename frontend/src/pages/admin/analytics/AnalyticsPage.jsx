// src/pages/admin/AnalyticsDashboard.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  UserOutlined,
  TeamOutlined,
  RiseOutlined,
  SmileOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Divider,
  Space,
  Tabs,
  Spin,
  message,
} from "antd";
import { Users } from "lucide-react";

const { Title, Text } = Typography;

const formatNumber = (num) => {
  const n = Number(num ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n).toLocaleString();
};

const StatCard = ({ title, value, subtext, icon }) => (
  <Card hoverable className="transition-shadow duration-300 shadow-md">
    <Space align="start">
      <div className="text-blue-500 text-2xl">{icon}</div>
      <div>
        <Text type="secondary">{title}</Text>
        <Title level={4} style={{ margin: 0 }}>{formatNumber(value)}</Title>
        {subtext && <Text type="success">{subtext}</Text>}
      </div>
    </Space>
  </Card>
);

export default function AnalyticsDashboard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({});
  const [revenue, setRevenue] = useState({});
  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      api.get("/analytics/dashboard"),
      api.get("/admin/dashboard"),
    ])
      .then(([analyticsRes, adminRes]) => {
        // ---- Analytics payload ----
        if (analyticsRes.status === "fulfilled") {
          const a = analyticsRes.value?.data ?? {};
          setStats(a.stats ?? {});
          setInsights(a.customerInsights ?? {});
          setRevenue(a.revenue ?? {});
          setLineData(
            Array.isArray(a.lineData) ? a.lineData.map((item) => ({ ...item, name: item.date })) : []
          );
          setBarData(
            Array.isArray(a.barData) ? a.barData.map((item) => ({ ...item, name: item.label })) : []
          );
        } else {
          message.error("Failed to fetch analytics data");
        }

        // ---- Admin overview for parents + students ----
        let parents = 0;
        let students = 0;

        if (adminRes.status === "fulfilled") {
          const overview = adminRes.value?.data?.overview ?? {};
          parents = Number(overview.parents ?? 0);
          students = Number(overview.students ?? 0);
        } else {
          // Don't block; we still render analytics
        }

        // Force Total Users = Parents + Students when we have either count
        const hasAnyPart = Number.isFinite(parents) && Number.isFinite(students) && (parents || students);
        setStats((prev) => ({
          ...prev,
          totalUsers: hasAnyPart
            ? parents + students
            : Number(prev?.totalUsers ?? 0),
        }));
      })
      .catch(() => {
        message.error("Failed to load analytics/overview");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen dark:bg-gray-900 dark:text-white">
      <Title level={2}>📊 Analytics</Title>
      <Text type="secondary">Analyze platform usage and customer behavior.</Text>

      <Tabs defaultActiveKey="1" className="mt-4">
        {/* 📈 General Usage */}
        <Tabs.TabPane tab="General Usage" key="1">
          <Divider orientation="left">Usage Overview</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard title="Total Users" value={stats.totalUsers} subtext="+5%" icon={<UserOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Active Users" value={stats.activeUsers} subtext="+3%" icon={<TeamOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="New Users" value={stats.newUsers} subtext="+10%" icon={<RiseOutlined />} />
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24} md={12}>
              <Card title="📈 User Growth">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="📊 Activity Trends">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#722ed1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* 😊 Customer Insights */}
        <Tabs.TabPane tab="Customer Insights" key="2">
          <Divider orientation="left">Customer Behavior</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard title="Satisfaction" value={insights.satisfaction} subtext="+2%" icon={<SmileOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Avg. Session (min)" value={insights.sessionDuration} subtext="+1m" icon={<ClockCircleOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Retention Rate" value={insights.retentionRate} icon={<ReloadOutlined />} />
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* 💰 Revenue */}
        <Tabs.TabPane tab="Revenue & Subscriptions" key="3">
          <Divider orientation="left">Revenue</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard title="Total Revenue" value={revenue.total} subtext="+10%" icon={<DollarOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Subscriptions" value={revenue.subscriptions} icon={<Users />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Renewal Rate" value={revenue.renewalRate} icon={<ReloadOutlined />} />
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>

      <div className="mt-8 text-right">
        <Space>
          <Button icon={<FilePdfOutlined />}>Export as PDF</Button>
          <Button type="primary" icon={<FileExcelOutlined />}>Export CSV</Button>
        </Space>
      </div>
    </div>
  );
}
