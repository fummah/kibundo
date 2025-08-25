// src/pages/parent/helpdesk/Tickets.jsx
import { useMemo, useState } from "react";
import { Card, Table, Tag, Button, Modal, Input, Select, message, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import GradientShell from "@/components/GradientShell";

const DUMMY = [
  { id: "T-1024", subject: "Invoice question", status: "open", priority: "medium", created_at: dayjs().subtract(1, "day").toISOString() },
  { id: "T-1025", subject: "Scan failed to process", status: "open", priority: "high", created_at: dayjs().subtract(3, "hour").toISOString() },
  { id: "T-1020", subject: "Feature request: dark mode", status: "closed", priority: "low", created_at: dayjs().subtract(10, "day").toISOString() },
];

const STATUS = {
  open: <Tag color="blue">Open</Tag>,
  closed: <Tag color="default">Closed</Tag>,
};
const PRIORITY = {
  high: <Tag color="red">High</Tag>,
  medium: <Tag color="gold">Medium</Tag>,
  low: <Tag>Low</Tag>,
};

export default function Tickets() {
  const [tickets, setTickets] = useState(DUMMY);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ subject: "", priority: "medium" });

  const data = useMemo(() => {
    const qt = q.trim().toLowerCase();
    return tickets.filter(t => t.subject.toLowerCase().includes(qt) || t.id.toLowerCase().includes(qt));
  }, [q, tickets]);

  const columns = [
    { title: "Ticket", dataIndex: "id", key: "id", width: 120 },
    { title: "Subject", dataIndex: "subject", key: "subject" },
    { title: "Status", dataIndex: "status", key: "status", width: 120, render: (v) => STATUS[v] },
    { title: "Priority", dataIndex: "priority", key: "priority", width: 120, render: (v) => PRIORITY[v] },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 160, render: (v) => dayjs(v).format("MMM D, HH:mm") },
  ];

  const create = () => {
    if (!draft.subject.trim()) return message.error("Please enter a subject.");
    const id = "T-" + Math.floor(1000 + Math.random() * 9000);
    setTickets(prev => [{ id, subject: draft.subject.trim(), status: "open", priority: draft.priority, created_at: new Date().toISOString() }, ...prev]);
    setOpen(false);
    setDraft({ subject: "", priority: "medium" });
    message.success("Ticket created");
  };

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Tickets</h1>
            <p className="text-gray-600 m-0">Ask for help or report an issue.</p>
          </div>
          <Space>
            <Input.Search allowClear placeholder="Search subject or ticket id" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl" />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New Ticket</Button>
          </Space>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 6, showSizeChanger: false }}
          />
        </Card>

        <Modal title="New Ticket" open={open} onCancel={() => setOpen(false)} onOk={create} okText="Create">
          <Space direction="vertical" className="w-full">
            <Input
              placeholder="Subject"
              value={draft.subject}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
            />
            <Select
              value={draft.priority}
              onChange={(v) => setDraft((d) => ({ ...d, priority: v }))}
              options={[
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
              className="w-full"
            />
          </Space>
        </Modal>
      </div>
    </GradientShell>
  );
}
