// src/pages/admin/AdminDashboard.jsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Row,
  Col,
  Space,
  Avatar,
  Statistic,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  FileTextOutlined,
  DatabaseOutlined,
  BookOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";

const { Text } = Typography;

/* ------------------------------ Data Layer ------------------------------ */

// Helper to safely GET JSON with Bearer token
async function getJson(path, token) {
  try {
    const { data } = await api.get(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: true,
    });
    return data ?? null;
  } catch (e) {
    return null;
  }
}

// Pulls from all listed routes concurrently. Uses /admin/dashboard when available.
async function fetchDashboardBundle(token) {
  const [
    overview, // GET /admin/dashboard
    users, // GET /users
    parents, // GET /parents
    students, // GET /allstudents
    teachers, // GET /allteachers
    classes, // GET /allclasses
    subjects, // GET /allsubjects
    products, // GET /products
    subscriptions, // GET /subscriptions
    blogposts, // GET /blogposts
  ] = await Promise.all([
    getJson("/admin/dashboard", token),
    getJson("/users", token),
    getJson("/parents", token),
    getJson("/allstudents", token),
    getJson("/allteachers", token),
    getJson("/allclasses", token),
    getJson("/allsubjects", token),
    getJson("/products", token),
    getJson("/subscriptions", token),
    getJson("/blogposts", token),
  ]);

  const len = (x) => (Array.isArray(x) ? x.length : 0);

  return {
    overview, // may contain totalUsers, parents, reports, activeContracts, deltas
    counts: {
      users: len(users),
      parents: len(parents),
      students: len(students),
      teachers: len(teachers),
      classes: len(classes),
      subjects: len(subjects),
      products: len(products),
      subscriptions: len(subscriptions),
      blogposts: len(blogposts),
    },
  };
}

/* ------------------------------ Fallbacks ------------------------------ */

const FALLBACK = {
  totalUsers: 0,
  parents: 0,
  reports: 0,
  activeContracts: 0,
  deltas: { usersMoM: 0, parentsWoW: 0, reports30d: 0, contractsDue: 0 },
};

/* ------------------------------ Component ------------------------------ */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const token = user?.token;

  const {
    data,
    isFetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["admin-dashboard-bundle"],
    queryFn: () => fetchDashboardBundle(token),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const o = data?.overview || {};
    const deltas = o?.deltas || {};
    // Prefer overview -> fall back to list counts -> fall back to constants
    return {
      totalUsers: o.totalUsers ?? data?.counts?.users ?? FALLBACK.totalUsers,
      parents: o.parents ?? data?.counts?.parents ?? FALLBACK.parents,
      reports: o.reports ?? FALLBACK.reports,
      activeContracts: o.activeContracts ?? FALLBACK.activeContracts,
      usersMoM:
        Number.isFinite(deltas.usersMoM) ? deltas.usersMoM : FALLBACK.deltas.usersMoM,
      parentsWoW:
        Number.isFinite(deltas.parentsWoW) ? deltas.parentsWoW : FALLBACK.deltas.parentsWoW,
      reports30d:
        Number.isFinite(deltas.reports30d) ? deltas.reports30d : FALLBACK.deltas.reports30d,
      contractsDue:
        Number.isFinite(deltas.contractsDue) ? deltas.contractsDue : FALLBACK.deltas.contractsDue,
    };
  }, [data]);

  const extra = useMemo(() => {
    const c = data?.counts || {};
    return {
      students: c.students ?? 0,
      teachers: c.teachers ?? 0,
      classes: c.classes ?? 0,
      subjects: c.subjects ?? 0,
      products: c.products ?? 0,
      subscriptions: c.subscriptions ?? 0,
      blogposts: c.blogposts ?? 0,
      users: c.users ?? 0,
      parents: c.parents ?? 0,
    };
  }, [data]);

  // Reusable styles
  const kpiCardProps = {
    hoverable: true,
    className:
      "rounded-xl text-white transition-transform duration-200 hover:scale-[1.02] flex-1",
    bodyStyle: { minHeight: 120, display: "flex", alignItems: "center" },
  };

  const featureCardProps = {
    hoverable: true,
    className:
      "rounded-xl shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] cursor-pointer flex-1",
    bodyStyle: { minHeight: 170, display: "flex", alignItems: "center" },
  };

  const features = [
    {
      icon: <PieChartOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
      title: "Statistics Dashboard",
      desc: "Access real-time platform usage statistics.",
      to: "/admin/statistics",
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
      title: "Report Generation",
      desc: "Generate detailed reports on user activity and performance.",
      to: "/admin/reports/generate",
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
      title: "Contract Management",
      desc: "Manage contracts with schools and institutions.",
      to: "/admin/billing/contract",
    },
    {
      icon: <DatabaseOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
      title: "Database Management",
      desc: "Oversee and manage the platform's database.",
      to: "/admin/analytics",
    },
    {
      icon: <BookOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
      title: "Educational Philosophy",
      desc: "Review the core educational principles guiding the platform.",
      to: "/admin/content",
    },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Master Support Interface</h1>
         
        </div>
        <Space>
          <Button onClick={() => refetch()} icon={<ReloadOutlined />}>
            Refresh
          </Button>
          {isFetching ? <Spin size="small" /> : null}
        </Space>
      </div>

      {/* Platform Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              {...kpiCardProps}
              className={`${kpiCardProps.className} bg-gradient-to-br from-indigo-600 to-violet-600`}
            >
              <div className="w-full flex items-center justify-between">
                <Space>
                  <Avatar size="large" icon={<UserOutlined />} className="bg-white/20" />
                  <div>
                    <span className="text-white/80 text-sm">Total Users</span>
                    <div className="text-3xl font-bold leading-none">
                      {kpis.totalUsers ?? "-"}
                    </div>
                  </div>
                </Space>
                <Statistic
                  value={kpis.usersMoM}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={kpis.usersMoM >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  title={<span className="text-white/80">MoM</span>}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              {...kpiCardProps}
              className={`${kpiCardProps.className} bg-gradient-to-br from-sky-500 to-cyan-500`}
            >
              <div className="w-full flex items-center justify-between">
                <Space>
                  <Avatar size="large" icon={<TeamOutlined />} className="bg-white/20" />
                  <div>
                    <span className="text-white/80 text-sm">Parents</span>
                    <div className="text-3xl font-bold leading-none">{kpis.parents ?? "-"}</div>
                  </div>
                </Space>
                <Statistic
                  value={kpis.parentsWoW}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={kpis.parentsWoW >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  title={<span className="text-white/80">WoW</span>}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              {...kpiCardProps}
              className={`${kpiCardProps.className} bg-gradient-to-br from-emerald-500 to-teal-500`}
            >
              <div className="w-full flex items-center justify-between">
                <Space>
                  <Avatar size="large" icon={<FileTextOutlined />} className="bg-white/20" />
                  <div>
                    <span className="text-white/80 text-sm">Reports Generated</span>
                    <div className="text-3xl font-bold leading-none">{kpis.reports ?? "-"}</div>
                  </div>
                </Space>
                <Statistic
                  value={kpis.reports30d}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={kpis.reports30d >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  title={<span className="text-white/80">30d</span>}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              {...kpiCardProps}
              className={`${kpiCardProps.className} bg-gradient-to-br from-rose-500 to-orange-500`}
            >
              <div className="w-full flex items-center justify-between">
                <Space>
                  <Avatar size="large" icon={<DatabaseOutlined />} className="bg-white/20" />
                  <div>
                    <span className="text-white/80 text-sm">Active Contracts</span>
                    <div className="text-3xl font-bold leading-none">
                      {kpis.activeContracts ?? "-"}
                    </div>
                  </div>
                </Space>
                <Statistic
                  value={kpis.contractsDue}
                  precision={0}
                  suffix=" due"
                  valueStyle={{ color: "#fff" }}
                  title={<span className="text-white/80">Next 30d</span>}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Data Snapshot (driven by DB counts) 
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Data Snapshot</h2>
        <Card className="rounded-xl">
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Users</Text>
                <Tag>{extra.users}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Parents</Text>
                <Tag color="blue">{extra.parents}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Students</Text>
                <Tag color="green">{extra.students}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Teachers</Text>
                <Tag color="purple">{extra.teachers}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Classes</Text>
                <Tag color="magenta">{extra.classes}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Subjects</Text>
                <Tag color="volcano">{extra.subjects}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Products</Text>
                <Tag color="geekblue">{extra.products}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Subscriptions</Text>
                <Tag color="gold">{extra.subscriptions}</Tag>
              </Space>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Blog Posts</Text>
                <Tag color="cyan">{extra.blogposts}</Tag>
              </Space>
            </Col>
          </Row>
        </Card>
      </section>*/}

      {/* Key Functionalities */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Key Functionalities</h2>
        <Row gutter={[16, 16]}>
          {features.map((item, index) => (
            <Col key={index} xs={24} sm={12} md={8} lg={6} style={{ display: "flex" }}>
              <Card
                {...featureCardProps}
                onClick={() => item.to && navigate(item.to)}
              >
                <div className="w-full flex flex-col items-center text-center gap-2">
                  {item.icon}
                  <p className="font-semibold mt-1">{item.title}</p>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            type="primary"
            className="shadow-sm"
            onClick={() => navigate("/admin/reports/generate")}
          >
            Generate Report
          </Button>
          <Button
            className="shadow-sm"
            onClick={() => navigate("/admin/billing/contract")}
          >
            Manage Contracts
          </Button>
        </div>
      </section>
    </div>
  );
}
