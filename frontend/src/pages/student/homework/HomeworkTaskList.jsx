import { useMemo, useState } from "react";
import { Table, Tag, Typography, Button, Space, Input, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const MOCK = [
  { id: 1, subject: "Math", desc: "Fractions — page 14, Q1–5", due: "2025-09-01", status: "open" },
  { id: 2, subject: "Language", desc: "Underline verbs — worksheet A", due: "2025-08-30", status: "in_progress" },
  { id: 3, subject: "Science", desc: "Draw the water cycle", due: "2025-09-03", status: "open" },
  { id: 4, subject: "Art", desc: "Color the autumn leaves", due: "2025-09-02", status: "done" },
];

export default function HomeworkTaskList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const data = useMemo(() => {
    return MOCK.filter((t) => {
      const okQ = !query || t.desc.toLowerCase().includes(query.toLowerCase()) || t.subject.toLowerCase().includes(query.toLowerCase());
      const okS = status === "all" || t.status === status;
      return okQ && okS;
    });
  }, [query, status]);

  const columns = [
    { title: "Subject", dataIndex: "subject", key: "subject" },
    { title: "Description", dataIndex: "desc", key: "desc" },
    { title: "Due", dataIndex: "due", key: "due" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) =>
        v === "done" ? <Tag color="green">Done</Tag> :
        v === "in_progress" ? <Tag color="gold">In progress</Tag> :
        <Tag color="blue">Open</Tag>,
    },
    // inside columns array (append an Actions column)
{
  title: "Actions",
  key: "actions",
  render: (_, row) => (
    <Space>
      <Button size="small" onClick={() =>
        navigate(`/student/homework/review?taskId=${row.id}&subject=${encodeURIComponent(row.subject)}&desc=${encodeURIComponent(row.desc)}`)
      }>
        Review & Submit
      </Button>
    </Space>
  ),
}

  ];

  return (
    <div className="px-3 md:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <Title level={4} className="!mb-0">My Tasks</Title>
        <Space>
          <Input.Search placeholder="Search tasks..." allowClear onSearch={(v) => setQuery(v)} onChange={(e) => setQuery(e.target.value)} className="w-56" />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ]}
            className="w-40"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/student/homework/interaction")}
            className="rounded-xl"
          >
            Add Homework
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 5 }}
        className="bg-white rounded-2xl overflow-hidden"
      />
    </div>
  );
}
