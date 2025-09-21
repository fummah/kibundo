// src/pages/admin/AdminDashboard.jsx
import { useMemo, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Row,
  Col,
  Space,
  Statistic,
  Spin,
  Typography,
  Result,
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
  BookOutlined,
  ShoppingCartOutlined,
  FileDoneOutlined,
  BarChartOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";

const { Text, Title } = Typography;

// Data fetching utilities
const getJson = async (path) => {
  try {
    const { data } = await api.get(path);
    return data ?? null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return null;
  }
};

const fetchDashboardBundle = async () => {
  try {
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
      getJson("/admin/dashboard"),
      getJson("/users"),
      getJson("/parents"),
      getJson("/allstudents"),
      getJson("/allteachers"),
      getJson("/allclasses"),
      getJson("/allsubjects"),
      getJson("/products"),
      getJson("/subscriptions"),
      getJson("/blogposts"),
    ]);

    const len = (x) =>
      Array.isArray(x) ? x.length : (Array.isArray(x?.data) ? x.data.length : 0);

    return {
      overview: overview || {},
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
  } catch (error) {
    console.error('Error in fetchDashboardBundle:', error);
    throw error;
  }
};

// Fallback data
const FALLBACK = {
  totalUsers: 0,
  parents: 0,
  students: 0,
  teachers: 0,
  classes: 0,
  subjects: 0,
  products: 0,
  subscriptions: 0,
  blogposts: 0,
};

function ErrorFallback({ error, onRetry, isFetching }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Result
        status="error"
        title="Failed to load dashboard"
        subTitle={error?.message || "An error occurred while loading the dashboard"}
        extra={[
          <Button type="primary" key="retry" onClick={onRetry} icon={<ReloadOutlined />}>
            Try Again
          </Button>,
        ]}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Space direction="vertical" align="center" size="large">
        <Spin size="large" />
        <Text type="secondary">Loading dashboard data...</Text>
      </Space>
    </div>
  );
}

const KPICard = ({ title, value, icon, delta, onClick, className = "" }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      className={`rounded-xl text-white transition-all duration-200 hover:scale-[1.02] ${className}`}
      styles={{ body: { minHeight: 120, display: "flex", alignItems: "center" } }}
    >
      <div className="flex items-center justify-between w-full">
        <div>
          <div className="text-white/80 text-sm">{title}</div>
          <div className="text-3xl font-bold leading-none mt-1">
            {value ?? "-"}
          </div>
          {delta !== undefined && (
            <div
              className={`text-xs mt-1 flex items-center ${
                delta >= 0 ? "text-green-200" : "text-red-200"
              }`}
            >
              {delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span className="ml-1">{Math.abs(delta)}%</span>
              <span className="ml-1">{delta >= 0 ? "increase" : "decrease"}</span>
            </div>
          )}
        </div>
        <div className="text-white/30 text-4xl">
          {icon}
        </div>
      </div>
    </Card>
  );
};

const FeatureCard = ({ title, description, icon, onClick }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] cursor-pointer flex-1 h-full"
      styles={{ body: { minHeight: 170, display: "flex", alignItems: "center" } }}
    >
      <Space direction="vertical" size="middle" className="w-full">
        <div className="text-blue-500 text-2xl">{icon}</div>
        <Title level={4} className="m-0">
          {title}
        </Title>
        <Text type="secondary" className="text-sm">
          {description}
        </Text>
      </Space>
    </Card>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuthContext();
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  const {
    data,
    isFetching,
    isError: isQueryError,
    error: queryError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-dashboard-bundle", retryCount],
    queryFn: async () => {
      if (!user?.token && !localStorage.getItem('token')) {
        throw new Error('Authentication required');
      }
      try {
        const result = await fetchDashboardBundle();
        setHasError(false);
        setError(null);
        return result;
      } catch (err) {
        setHasError(true);
        setError(err);
        throw err;
      }
    },
    enabled: isInitialized && !!user?.token,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    refetch();
  }, [refetch]);

  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  const kpis = useMemo(() => {
    const counts = data?.counts || FALLBACK;
    return [
      {
        title: "Total Users",
        value: counts.users,
        icon: <UserOutlined />,
        delta: 12,
        color: "bg-blue-500",
        onClick: () => navigate("/admin/users"),
      },
      {
        title: "Total Students",
        value: counts.students,
        icon: <UserOutlined />,
        delta: 8,
        color: "bg-green-500",
        onClick: () => navigate("/admin/students"),
      },
      {
        title: "Total Teachers",
        value: counts.teachers,
        icon: <UserOutlined />,
        delta: 5,
        color: "bg-purple-500",
        onClick: () => navigate("/admin/teachers"),
      },
      {
        title: "Total Classes",
        value: counts.classes,
        icon: <TeamOutlined />,
        delta: 15,
        color: "bg-amber-500",
        onClick: () => navigate("/admin/classes"),
      },
    ];
  }, [data, navigate]);

  const features = useMemo(
    () => [
      {
        icon: <PieChartOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
        title: "Statistics Dashboard",
        description: "Access real-time platform usage statistics.",
        to: "/admin/statistics",
      },
      {
        icon: <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
        title: "Report Generation",
        description: "Generate detailed reports on user activity and performance.",
        to: "/admin/reports/generate",
      },
      {
        icon: <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
        title: "Contract Management",
        description: "Manage contracts with schools and institutions.",
        to: "/admin/billing/contract",
      },
      {
        icon: <DatabaseOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
        title: "Database Management",
        description: "Oversee and manage the platform's database.",
        to: "/admin/database",
      },
    ],
    []
  );

  const quickActions = useMemo(
    () => [
      {
        title: "New User",
        icon: <UserOutlined />,
        onClick: () => navigate("/admin/users/new"),
      },
      {
        title: "New Post",
        icon: <FileTextOutlined />,
        onClick: () => navigate("/admin/content/new"),
      },
      {
        title: "View Reports",
        icon: <BarChartOutlined />,
        onClick: () => navigate("/admin/reports"),
      },
      {
        title: "Settings",
        icon: <DatabaseOutlined />,
        onClick: () => navigate("/admin/settings"),
      },
    ],
    [navigate]
  );

  if (hasError) {
    return <ErrorFallback error={error} onRetry={handleRetry} isFetching={isFetching} />;
  }

  if (isFetching && !data) {
    return <LoadingState />;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          Admin Dashboard
        </Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={isFetching || isRefetching}
          onClick={refreshData}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            delta={kpi.delta}
            onClick={kpi.onClick}
            className={kpi.color}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="mb-6">
        <Space wrap>
          {quickActions.map((action, index) => (
            <Button
              key={index}
              icon={action.icon}
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              {action.title}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Features */}
      <Title level={4} className="mb-4">
        Features
      </Title>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            onClick={() => navigate(feature.to)}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <Card
        title="Recent Activity"
        extra={
          <Button type="link" onClick={() => navigate("/admin/activity")}>
            View All
          </Button>
        }
      >
        <div className="text-center py-8">
          <Text type="secondary">No recent activity</Text>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;