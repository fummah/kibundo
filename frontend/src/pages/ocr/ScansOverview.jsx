import React, { useMemo, useState } from "react";
import {
  Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography
} from "antd";
import { FileSearchOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
const { RangePicker } = DatePicker;

const mockRows = [
  { id: 101, student: "A. Moyo", class: "Grade 4", file: "math_hw_101.jpg", uploadedAt: "2025-08-15 14:22", status: "Pending" },
  { id: 102, student: "B. Dlamini", class: "Grade 6", file: "science_sheet.pdf", uploadedAt: "2025-08-14 09:10", status: "Completed" },
  { id: 103, student: "T. Ncube", class: "Grade 3", file: "reading_task.png", uploadedAt: "2025-08-13 16:05", status: "Failed" },
];

export default function ScansOverview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return mockRows.filter(r =>
      (!status || r.status === status) &&
      (!q || `${r.student} ${r.class} ${r.file}`.toLowerCase().includes(q.toLowerCase()))
    );
  }, [status, q]);

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Student", dataIndex: "student" },
    { title: "Class", dataIndex: "class" },
    { title: "File", dataIndex: "file" },
    { title: "Uploaded", dataIndex: "uploadedAt" },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => <Tag color={s === "Completed" ? "green" : s === "Failed" ? "red" : "gold"}>{s}</Tag>,
    },
    {
      key: "actions",
      render: (_, rec) => (
        <Space>
          <Button size="small" type="link" onClick={() => navigate(`/admin/scans/ocr?id=${rec.id}`)}>
            Open
          </Button>
          {rec.status === "Failed" && (
            <Button size="small" icon={<ReloadOutlined />} onClick={() => navigate(`/admin/scans/ocr?id=${rec.id}&retry=1`)}>
              Retry
            </Button>
          )}
        </Space>
      ),
    },
  ], [navigate]);

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
          <FileSearchOutlined /> Homework / Scans
        </Typography.Title>
        <Space>
          <Link to="/admin/scans/ocr">
            <Button type="primary" icon={<PlusOutlined />}>New OCR Job</Button>
          </Link>
        </Space>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-gray-500 text-sm">Pending</div><div className="text-3xl font-bold mt-1">7</div></Card>
        <Card><div className="text-gray-500 text-sm">Completed (7d)</div><div className="text-3xl font-bold mt-1">42</div></Card>
        <Card><div className="text-gray-500 text-sm">Failed (7d)</div><div className="text-3xl font-bold mt-1">3</div></Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by student, class, file…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="Status"
              value={status}
              onChange={setStatus}
              allowClear
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Completed", label: "Completed" },
                { value: "Failed", label: "Failed" },
              ]}
              style={{ width: 180 }}
            />
            <RangePicker />
          </Space>

          <Space>
            <Button onClick={() => { setQ(""); setStatus(undefined); }}>Reset</Button>
           
          </Space>
        </div>

        <div className="mt-4">
          <Table rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} />
        </div>
      </Card>
    </Space>
  );
}
