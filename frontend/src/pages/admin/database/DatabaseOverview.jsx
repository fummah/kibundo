import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Input,
  Button,
  Tag,
  message,
  Tooltip,
  Spin,
  Space, // ✅ Add this line
} from "antd";

import {
  ReloadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
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
import api from "@/api/axios";

const { Title, Text } = Typography;

export default function DatabaseManager() {
  const [loading, setLoading] = useState(true);
  const [database, setDatabase] = useState([]);
  const [search, setSearch] = useState("");
  const [statsData, setStatsData] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/database/overview");
      setDatabase(data.tables);
      setStatsData(data.stats);
    } catch (err) {
      message.error("Failed to fetch database info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    const input = document.getElementById("db-table");
    if (!input) return;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10);
    pdf.save("database-overview.pdf");
  };

  const columns = [
    {
      title: "Table Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Records",
      dataIndex: "count",
      key: "count",
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="link" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="link" icon={<DeleteOutlined />} danger />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredData = database.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={3}>
            <DatabaseOutlined /> Database Manager
          </Title>
        </Col>
        <Col>
          <Space>
            <Input.Search
              placeholder="Search table..."
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export PDF
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 📊 Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card title="Records per Table">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statsData}>
                <XAxis dataKey="table" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Table Update Trends">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={statsData}>
                <XAxis dataKey="table" />
                <YAxis />
                <RechartsTooltip />
                <Line dataKey="count" stroke="#52c41a" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 🗂 Table Viewer */}
      <div id="db-table">
        <Card title="Database Tables" bordered className="shadow-sm">
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="name"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      </div>
    </div>
  );
}
