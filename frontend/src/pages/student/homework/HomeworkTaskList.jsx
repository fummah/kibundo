// src/pages/student/homework/HomeworkTaskList.jsx
import { useMemo, useState } from "react";
import { Table, Tag, Typography, Button, Space, Input, Select, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat";

const { Title, Text } = Typography;

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
      const q = query.trim().toLowerCase();
      const okQ =
        !q ||
        t.desc.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q);
      const okS = status === "all" || t.status === status;
      return okQ && okS;
    });
  }, [query, status]);

  const columns = [
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Description",
      dataIndex: "desc",
      key: "desc",
      ellipsis: true,
    },
    {
      title: "Due",
      dataIndex: "due",
      key: "due",
      width: 120,
      responsive: ["sm"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v) =>
        v === "done" ? (
          <Tag color="green">Done</Tag>
        ) : v === "in_progress" ? (
          <Tag color="gold">In progress</Tag>
        ) : (
          <Tag color="blue">Open</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 170,
      render: (_, row) => (
        <Space size="small" wrap>
          <Button
            size="small"
            className="rounded-lg"
            onClick={() =>
              navigate(
                `/student/homework/review?taskId=${row.id}&subject=${encodeURIComponent(
                  row.subject
                )}&desc=${encodeURIComponent(row.desc)}`
              )
            }
          >
            Review & Submit
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => navigate("/student/homework/interaction")}
          >
            Open
          </Button>
        </Space>
      ),
    },
  ];

  return (
    // Scrollable in all views; spacer at bottom avoids overlap with chat footer
    <div className="relative mx-auto w-full max-w-6xl px-3 md:px-6 py-4 min-h-[100svh] lg:h-full overflow-y-auto">
      {/* Header: Back + Banner + quick actions */}
      <div className="flex items-center gap-3 pt-2 pb-3 flex-wrap">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1 min-w-[240px]">
          <GreetingBanner
            title="My Tasks"
            subtitle="Track, filter, and submit your homework."
            className="!bg-white"
            translucent={false}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/student/homework/interaction")}
          className="rounded-xl"
        >
          Add Homework
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ padding: 14 }}>
        <div className="flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Search tasks…"
            allowClear
            onSearch={(v) => setQuery(v)}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ]}
            className="w-full sm:w-44"
          />
          <Text type="secondary" className="ml-auto">
            Showing {data.length} of {MOCK.length}
          </Text>
        </div>
      </Card>

      {/* Table (mobile-friendly with horizontal scroll) */}
      <Card className="rounded-2xl">
        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          className="bg-white rounded-xl overflow-hidden"
          scroll={{ x: 720 }} // enable horizontal scroll on small screens
        />
      </Card>

      {/* Keep content above the fixed chat footer */}
      <ChatStripSpacer />
    </div>
  );
}
