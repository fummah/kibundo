// src/pages/admin/AdminDashboard.jsx
import { Card, Button, Row, Col, Space, Avatar, Statistic } from "antd";
import {
  FileTextOutlined,
  DatabaseOutlined,
  BookOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Dummy KPI values (fallback safe)
  const totalUsers = 12500;
  const parents = 750;
  const reports = 320;
  const activeContracts = 12;

  // Reusable styles for consistent sizing
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
      <h1 className="text-3xl font-bold mb-6">Master Support Interface</h1>

      {/* Platform Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>

        {/* KPI Row (equal heights via flex) */}
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
                    <div className="text-3xl font-bold leading-none">{totalUsers ?? "-"}</div>
                  </div>
                </Space>
                <Statistic
                  value={8.2}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={<ArrowUpOutlined />}
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
                    <div className="text-3xl font-bold leading-none">{parents ?? "-"}</div>
                  </div>
                </Space>
                <Statistic
                  value={-1.3}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={<ArrowDownOutlined />}
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
                    <div className="text-3xl font-bold leading-none">{reports ?? "-"}</div>
                  </div>
                </Space>
                <Statistic
                  value={4.7}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: "#fff" }}
                  prefix={<ArrowUpOutlined />}
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
                      {activeContracts ?? "-"}
                    </div>
                  </div>
                </Space>
                <Statistic
                  value={2}
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

      {/* Key Functionalities (equal heights via flex) */}
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
