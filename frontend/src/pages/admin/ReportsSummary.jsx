import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Input,
  Button,
  Select,
  Space,
  message,
} from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
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

const { Title } = Typography;
const { Option } = Select;

export default function ReportsSummaryPage() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    axios.get("/api/reports/summary").then((res) => {
      setReports(res.data.reports || []);
      setChartData(res.data.chartData || []);
      setFilteredReports(res.data.reports || []);
    });
  }, []);

  useEffect(() => {
    let filtered = reports;
    if (searchTerm) {
      filtered = filtered.filter((report) =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((report) => report.role === roleFilter);
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

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 dark:text-white">
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <Title level={3}>📄 Reports Summary</Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 180 }}
            >
              <Option value="all">All Roles</Option>
              <Option value="admin">Admin</Option>
              <Option value="teacher">Teacher</Option>
              <Option value="student">Student</Option>
              <Option value="parent">Parent</Option>
            </Select>
            <Input
              placeholder="Search reports..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportPDF}
              type="primary"
            >
              Export PDF
            </Button>
          </Space>
        </Col>
      </Row>

      <div id="report-summary-content">
        {/* 📊 Charts */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} md={12}>
            <Card title="Reports by Month">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Reports Trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line dataKey="count" stroke="#52c41a" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 📋 Report List */}
        <Row gutter={[16, 16]}>
          {filteredReports.map((report, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card hoverable title={report.title} variant>
                <p>
                  <strong>Role:</strong> {report.role}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(report.date).toLocaleDateString()}
                </p>
                <p>{report.description}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
