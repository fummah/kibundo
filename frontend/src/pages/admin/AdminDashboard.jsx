import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Spin, Result, Button, Space, Tag, Typography, Card } from "antd";
import { 
  UserOutlined, 
  TeamOutlined, 
  SolutionOutlined, 
  FileDoneOutlined, 
  ArrowUpOutlined, 
  ReloadOutlined,
  PieChartOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import api from "@/api/axios";

const { Title, Text } = Typography;

// Data fetching utilities from the original file
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
      parents,
      students,
      subscriptions,
    ] = await Promise.all([
      getJson("/parents"),
      getJson("/allstudents"),
      getJson("/subscriptions"),
    ]);

    const len = (x) => Array.isArray(x) ? x.length : 0;

    return {
      counts: {
        parents: len(parents),
        students: len(students),
        activeContracts: (subscriptions || []).filter(s => s.status === 'active').length,
      },
    };
  } catch (error) {
    console.error('Error in fetchDashboardBundle:', error);
    throw error;
  }
};


// Reusable Dashboard Card Component (New UI)
const DashboardCard = ({ title, value, trend, trendLabel, breakdown, icon, color, onClick }) => (
  <div 
    className={`rounded-2xl p-6 text-white ${color} flex flex-col justify-between h-48 ${onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center">
        <div className="text-2xl bg-white/20 p-2 rounded-full mr-4">{icon}</div>
        <div>
          <div className="text-sm font-light opacity-80">{title}</div>
          <div className="text-4xl font-bold">{value}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-light opacity-80">{trendLabel}</div>
        <div className="text-lg font-semibold flex items-center">
          <ArrowUpOutlined className="mr-1" /> {trend}%
        </div>
      </div>
    </div>
    {breakdown && (
      <Space size="small">
        {breakdown.map(item => (
          <Tag key={item.label} color="rgba(255, 255, 255, 0.2)" className="!m-0 border-none text-white/90">
            {item.label}: {item.value}
          </Tag>
        ))}
      </Space>
    )}
  </div>
);

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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adminDashboardBundle"],
    queryFn: fetchDashboardBundle,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
        title: "Generate Report",
        icon: <BarChartOutlined />,
        onClick: () => navigate("/admin/reports/generate"),
        type: "primary",
      },
      {
        title: "Manage Contracts",
        icon: <FileTextOutlined />,
        onClick: () => navigate("/admin/billing/contract"),
        type: "default",
      },
    ],
    [navigate]
  );

  if (isLoading) {
    return <div className="w-full h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Failed to Load Dashboard"
        subTitle={error.message}
        extra={<Button type="primary" onClick={refetch}>Try Again</Button>}
      />
    );
  }

  const counts = data?.counts || {};

  const cards = [
    {
      title: "Total Users",
      value: (counts.parents || 0) + (counts.students || 0),
      trend: 0.0, // Placeholder
      trendLabel: "MoM",
      icon: <UserOutlined />,
      color: "bg-gradient-to-br from-purple-500 to-indigo-600",
      breakdown: [
        { label: "Parents", value: counts.parents },
        { label: "Students", value: counts.students },
      ],
      // This card is a summary, so it's not clickable.
    },
    {
      title: "Parents",
      value: counts.parents,
      trend: 0.0, // Placeholder
      trendLabel: "WoW",
      icon: <TeamOutlined />,
      color: "bg-gradient-to-br from-cyan-500 to-blue-600",
      onClick: () => navigate('/admin/parents'),
    },
    {
      title: "Students",
      value: counts.students,
      trend: 0.0, // Placeholder
      trendLabel: "MoM",
      icon: <SolutionOutlined />,
      color: "bg-gradient-to-br from-teal-500 to-green-600",
      onClick: () => navigate('/admin/students'),
    },
    {
      title: "Active Contracts",
      value: counts.activeContracts,
      trend: 0, // Placeholder
      trendLabel: "Next 30d",
      icon: <FileDoneOutlined />,
      color: "bg-gradient-to-br from-rose-500 to-orange-600",
      onClick: () => navigate('/admin/subscriptions'),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          Admin Dashboard
        </Title>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <DashboardCard key={index} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="my-6 rounded-xl">
        <Space wrap>
          {quickActions.map((action, index) => (
            <Button
              key={index}
              type={action.type}
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

      {/* Recent Activity 
      <Card
        title="Recent Activity"
        className="rounded-xl"
        extra={
          <Button type="link" onClick={() => navigate("/admin/activity")}>
            View All
          </Button>
        }
      >
        <div className="text-center py-8">
          <Text type="secondary">No recent activity</Text>
        </div>
      </Card>*/}
    </div>
  );
};

export default AdminDashboard;
