import { useEffect, useState } from "react";
import {
  FileAddOutlined,
  FileSearchOutlined,
  SolutionOutlined,
  BarChartOutlined,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Spin,
  message,
  Input,
  Select,
} from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ReportsDashboardSummary() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/reports/summary")
      .then((res) => {
        setStats(res.data);
        setReports(res.data.reports || []);
        setChartData(res.data.chartData || []);
        setFilteredReports(res.data.reports || []);
      })
      .catch(() => message.error("Failed to load report stats"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let filtered = reports;
    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((r) => r.role === roleFilter);
    }
    setFilteredReports(filtered);
  }, [searchTerm, roleFilter, reports]);

  const handleExportPDF = async () => {
    const input = document.getElementById("report-summary-content");
    if (!input) return;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("report-summary.pdf");
  };

  const fallback = (val) =>
    val === null || val === undefined ? (
      <Text type="secondary">No data</Text>
    ) : (
      <Title level={3} className="text-blue-600">{val}</Title>
    );

  const navCards = [
    {
      title: "Generate Reports",
      icon: <FileAddOutlined style={{ fontSize: 24 }} />,
      description: "Create customized reports using filters.",
      action: () => navigate("/admin/generate-reports"),
    },
    {
      title: "View Submissions",
      icon: <FileSearchOutlined style={{ fontSize: 24 }} />,
      description: "Browse past report submissions and records.",
      action: () => navigate("/admin/report-submissions"),
    },
    {
      title: "Contracts Reports",
      icon: <SolutionOutlined style={{ fontSize: 24 }} />,
      description: "Access all contract-related reporting.",
      action: () => navigate("/admin/contracts"),
    },
  ];

  return (
    <div className="p-4 sm:p-6 min-h-screen  dark:bg-gray-900 dark:text-white">
      <Title level={2} className="mb-0">
        <BarChartOutlined /> Reports Dashboard
      </Title>
      <Text type="secondary">Overview and quick access to all reporting sections.</Text>

      {loading ? (
        <div className="text-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 🔢 Stats */}
          <Row gutter={[16, 16]} className="my-6">
            <Col xs={24} sm={12} md={8}>
              <Card hoverable variant="outlined"><Text>Total Reports</Text>{fallback(stats?.totalReports)}</Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card hoverable variant="outlined"><Text>Pending Reviews</Text>{fallback(stats?.pending)}</Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card hoverable variant="outlined"><Text>Approved Reports</Text>{fallback(stats?.approved)}</Card>
            </Col>
          </Row>

          {/* 🎯 Navigation Cards */}
          <Row gutter={[16, 16]}>
            {navCards.map((card, idx) => (
              <Col xs={24} sm={12} md={8} key={idx}>
                <Card
                  variant="outlined"
                  hoverable
                  title={card.title}
                  onClick={card.action}
                  actions={[
                    <Button type="link" key="go" onClick={card.action} style={{ padding: 0 }}>Go</Button>,
                  ]}
                >
                  <Space align="start">
                    {card.icon}
                    <Text>{card.description}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 🔍 Filters & Controls */}
          <Row gutter={[16, 16]} className="my-6" align="middle">
            <Col xs={24} md={6}>
              <Select value={roleFilter} onChange={setRoleFilter} style={{ width: "100%" }}>
                <Option value="all">All Roles</Option>
                <Option value="admin">Admin</Option>
                <Option value="teacher">Teacher</Option>
                <Option value="student">Student</Option>
                <Option value="parent">Parent</Option>
              </Select>
            </Col>
            <Col xs={24} md={10}>
              <Input
                placeholder="Search reports..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col xs={24} md={8}>
              <Button icon={<DownloadOutlined />} onClick={handleExportPDF} type="primary" block>
                Export PDF
              </Button>
            </Col>
          </Row>

          <div id="report-summary-content">
            {/* 📊 Charts */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} md={12}>
                <Card title="Reports by Month" variant="outlined" hoverable>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#1890ff" animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Reports Trend" variant="outlined" hoverable>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line dataKey="count" stroke="#52c41a" animationDuration={800} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* 📋 Report List */}
            <Row gutter={[16, 16]}>
              {filteredReports.map((report, index) => (
                <Col xs={24} sm={12} md={8} key={index}>
                  <Card hoverable variant="outlined" title={report.title}>
                    <p><strong>Role:</strong> {report.role}</p>
                    <p><strong>Date:</strong> {new Date(report.date).toLocaleDateString()}</p>
                    <p>{report.description}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </>
      )}
    </div>
  );
}
