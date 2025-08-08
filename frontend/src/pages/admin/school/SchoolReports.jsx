// src/pages/school/DefaultSchoolReports.jsx
import { useState, useEffect } from "react";
import {
  Card,
  Button,
  DatePicker,
  Table,
  Select,
  Typography,
  Space,
  Dropdown,
  Menu,
} from "antd";
import {
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";


const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function DefaultSchoolReports() {
  const [reports, setReports] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/schools/default-school/reports");
      setReports(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRangeChange = (dates) => {
    setDateRange(dates);
    if (!dates) {
      setFiltered(reports);
      return;
    }
    const [start, end] = dates;
    const filteredData = reports.filter((report) => {
      const created = dayjs(report.createdAt);
      return created.isAfter(start) && created.isBefore(end);
    });
    setFiltered(filteredData);
  };

  const columns = [
    { title: "Report Name", dataIndex: "title", key: "title" },
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Created", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => console.log("Download", record)}>
            Download
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Title level={4} className="!mb-0">
            🧾 Reports Summary
          </Title>
          <div className="flex flex-wrap gap-2 items-center">
            <RangePicker onChange={handleRangeChange} />
            <Dropdown
              menu={{
                items: [
                  { key: "pdf", icon: <FilePdfOutlined />, label: "Export PDF" },
                  { key: "excel", icon: <FileExcelOutlined />, label: "Export Excel" },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />}>Export</Button>
            </Dropdown>
          </div>
        </div>
      }
      className="shadow-sm"
    >
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 5 }}
      />
    </Card>
  );
}
