import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  message,
  Button,
  Skeleton,
} from "antd";
import {
  UserOutlined,
  BookOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  BookFilled,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [dashboardRes, studentRes, teacherRes, subjectRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/allstudents"),
        api.get("/allteachers"),
        api.get("/allsubjects"), // ✅ Fetch subjects
      ]);

      setStats({
        totalUsers: dashboardRes.data?.totalUsers ?? "-",
        activeSchools: dashboardRes.data?.activeSchools ?? "-",
        totalReports: dashboardRes.data?.totalReports ?? "-",
        pendingContracts: dashboardRes.data?.pendingContracts ?? "-",
        totalStudents: studentRes.data?.length ?? "-",
        totalTeachers: teacherRes.data?.length ?? "-",
        totalSubjects: subjectRes.data?.length ?? "-", // ✅ Store subject count
      });

      setInsights([
        {
          label: "Logins This Month",
          value: dashboardRes.data?.analytics?.loginsThisMonth ?? "-",
        },
        {
          label: "Course Views",
          value: dashboardRes.data?.analytics?.courseViews ?? "-",
        },
      ]);

      setLineData(dashboardRes.data?.lineData ?? []);
    } catch (err) {
      console.error("❌ Failed to fetch dashboard:", err);
      message.error("❌ Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Admin Dashboard Report", 10, 10);
    doc.text(`Total Students: ${stats?.totalStudents}`, 10, 20);
    doc.text(`Total Teachers: ${stats?.totalTeachers}`, 10, 30);
    doc.text(`Total Subjects: ${stats?.totalSubjects}`, 10, 40);
    doc.save("dashboard-report.pdf");
  };

  const exportCSV = () => {
    const csv = `Label,Value\nTotal Students,${stats?.totalStudents}\nTotal Teachers,${stats?.totalTeachers}\nTotal Subjects,${stats?.totalSubjects}`;
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, "dashboard-report.csv");
  };

  const cards = [
    {
      label: "Total Students",
      value: stats?.totalStudents ?? "-",
      icon: <UserOutlined style={{ fontSize: 20 }} />,
    },
    {
      label: "Total Teachers",
      value: stats?.totalTeachers ?? "-",
      icon: <BookOutlined style={{ fontSize: 20 }} />,
    },
    {
      label: "Total Subjects",
      value: stats?.totalSubjects ?? "-",
      icon: <BarChartOutlined style={{ fontSize: 20 }} />,
    },
  ];

  const features = [
    {
      icon: <FileSearchOutlined style={{ fontSize: 20 }} />,
      title: "Statistics Dashboard",
      desc: "Real-time usage statistics.",
      path: "/admin/statistics",
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 20 }} />,
      title: "Report Generation",
      desc: "Generate user activity reports.",
      path: "/admin/generate-reports",
    },
    {
      icon: <DatabaseOutlined style={{ fontSize: 20 }} />,
      title: "Database Management",
      desc: "Manage the platform database.",
      path: "/admin/database",
    },
    {
      icon: <BookFilled style={{ fontSize: 20 }} />,
      title: "Philosophy",
      desc: "View educational principles.",
      path: "/admin/philosophy",
    },
  ];

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 dark:text-white">
      {/* HEADER */}
      <header className="mb-6 flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <Title level={2} className="!mb-0">
          🛠️ Admin Dashboard
        </Title>
        <div className="flex flex-wrap gap-2">
          <Button icon={<ReloadOutlined />} onClick={fetchStats}>
            Refresh
          </Button>
          {/* <Button icon={<DownloadOutlined />} onClick={exportPDF}>Export PDF</Button>
          <Button onClick={exportCSV}>Export CSV</Button> */}
        </div>
      </header>

      {/* STATS */}
      <section className="mb-10">
        <Title level={4}>📊 Platform Overview</Title>
        <Row gutter={[16, 16]}>
          {(loading ? [1, 2, 3] : cards).map((item, idx) => (
            <Col xs={24} sm={12} md={8} key={idx}>
              <Card hoverable>
                {loading ? (
                  <Skeleton active />
                ) : (
                  <Statistic
                    title={item.label}
                    value={item.value}
                    prefix={item.icon}
                    valueStyle={{ color: "#1890ff" }}
                  />
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* FEATURES */}
      <section className="mb-10">
        <Title level={4}>🚀 Key Functionalities</Title>
        <Row gutter={[16, 16]}>
          {features.map((item, idx) => (
            <Col xs={24} sm={12} md={8} key={idx}>
              <Card
                hoverable
                title={item.title}
                onClick={() => navigate(item.path)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-3 text-blue-600 text-lg mb-2">
                  {item.icon}
                  <span className="text-gray-800 dark:text-white">
                    {item.title}
                  </span>
                </div>
                <Text type="secondary">{item.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mb-10">
        <Title level={4}>⚡ Quick Actions</Title>
        <div className="flex flex-wrap gap-4 mt-2">
          <Button
            type="primary"
            onClick={() => navigate("/admin/generate-reports")}
          >
            Generate Report
          </Button>
          <Button onClick={() => navigate("/admin/contracts")}>
            Manage Contracts
          </Button>
        </div>
      </section>
    </div>
  );
}
