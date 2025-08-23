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
  const [
    overview,
    users,
    parents,
    students,
    teachers,
    classes,
    subjects,
    products,
    subscriptions,
    blogposts,
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
    overview,
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
  students: 0,
  activeContracts: 0,
  deltas: { usersMoM: 0, parentsWoW: 0, contractsDue: 0, studentsMoM: 0 },
};

/* ------------------------------ Component ------------------------------ */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const token = user?.token;

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-dashboard-bundle"],
    queryFn: () => fetchDashboardBundle(token),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const o = data?.overview || {};
    const deltas = o?.deltas || {};
    const counts = data?.counts || {};
    const totalUsers = o.totalUsers ?? counts.users ?? FALLBACK.totalUsers;
    const parents = o.parents ?? counts.parents ?? FALLBACK.parents;
    const students = o.students ?? counts.students ?? FALLBACK.students;

    return {
      totalUsers,
      parents,
      students,
      activeContracts: o.activeContracts ?? FALLBACK.activeContracts,
      usersMoM: Number.isFinite(deltas.usersMoM) ? deltas.usersMoM : FALLBACK.deltas.usersMoM,
      parentsWoW: Number.isFinite(deltas.parentsWoW) ? deltas.parentsWoW : FALLBACK.deltas.parentsWoW,
      studentsMoM: Number.isFinite(deltas.studentsMoM) ? deltas.studentsMoM : FALLBACK.deltas.studentsMoM,
      contractsDue:
        Number.isFinite(deltas.contractsDue) ? deltas.contractsDue : FALLBACK.deltas.contractsDue,
    };
  }, [data]);

  const featureCardProps = {
    hoverable: true,
    className:
      "rounded-xl shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] cursor-pointer flex-1",
    bodyStyle: { minHeight: 170, display: "flex", alignItems: "center" },
  };

  const kpiCardProps = {
    hoverable: true,
    className:
      "rounded-xl text-white transition-transform duration-200 hover:scale-[1.02] flex-1",
    bodyStyle: { minHeight: 120, display: "flex", alignItems: "center" },
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
    // ❌ Educational Philosophy removed
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
          {/* Total Users + split (Parents + Students) */}
          {/* Total Users + split (Parents + Students) */}
<Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
  <Card
    {...kpiCardProps}
    className={`${kpiCardProps.className} bg-gradient-to-br from-indigo-600 to-violet-600`}
  >
    <div className="w-full flex items-center justify-between">
      <Space align="start">
        <Avatar size="large" icon={<UserOutlined />} className="bg-white/20" />
        <div>
          <span className="text-white/80 text-sm">Total Users</span>
          <div className="text-3xl font-bold leading-none">
            {kpis.totalUsers ?? "-"}
          </div>

          {/* 👇 Aligned split */}
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Tag color="blue" className="!m-0">Parents</Tag>
              <Text className="text-white font-medium">{kpis.parents ?? "-"}</Text>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="green" className="!m-0">Students</Tag>
              <Text className="text-white font-medium">{kpis.students ?? "-"}</Text>
            </div>
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


          {/* Parents */}
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

          {/* Students (replaces Reports) */}
          <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
            <Card
              {...kpiCardProps}
              className={`${kpiCardProps.className} bg-gradient-to-br from-emerald-500 to-teal-500`}
            >
              <div className="w-full flex items-center justify-between">
                <Space>
                  <Avatar size="large" icon={<TeamOutlined />} className="bg-white/20" />
                  <div>
                    <span className="text-white/80 text-sm">Students</span>
                    <div className="text-3xl font-bold leading-none">{kpis.students ?? "-"}</div>
                  </div>
                </Space>
                {/* Optional MoM for students if provided */}
                <Statistic
                  value={kpis.studentsMoM}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={kpis.studentsMoM >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  title={<span className="text-white/80">MoM</span>}
                />
              </div>
            </Card>
          </Col>

          {/* Active Contracts (unchanged) */}
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

      {/* Key Functionalities */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Key Functionalities</h2>
        <Row gutter={[16, 16]}>
          {features.map((item, index) => (
            <Col key={index} xs={24} sm={12} md={8} lg={6} style={{ display: "flex" }}>
              <Card {...featureCardProps} onClick={() => item.to && navigate(item.to)}>
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
