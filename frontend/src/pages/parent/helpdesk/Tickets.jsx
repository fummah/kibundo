// src/pages/parent/helpdesk/Tickets.jsx
import { useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Select,
  message,
  Space,
  Form,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import GradientShell from "@/components/GradientShell";

const { TextArea } = Input;
const MSG_MIN = 20; // 🔒 Acceptance: minimum length for free-text message

const DUMMY = [
  {
    id: "T-1024",
    subject: "Invoice question",
    status: "open",
    priority: "medium",
    created_at: dayjs().subtract(1, "day").toISOString(),
  },
  {
    id: "T-1025",
    subject: "Scan failed to process",
    status: "open",
    priority: "high",
    created_at: dayjs().subtract(3, "hour").toISOString(),
  },
  {
    id: "T-1020",
    subject: "Feature request: dark mode",
    status: "closed",
    priority: "low",
    created_at: dayjs().subtract(10, "day").toISOString(),
  },
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
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const data = useMemo(() => {
    const qt = q.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(qt) ||
        t.id.toLowerCase().includes(qt)
    );
  }, [q, tickets]);

  const columns = [
    { title: "Ticket", dataIndex: "id", key: "id", width: 120 },
    { title: "Subject", dataIndex: "subject", key: "subject" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => STATUS[v],
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 120,
      render: (v) => PRIORITY[v],
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v) => dayjs(v).format("MMM D, HH:mm"),
    },
  ];

  const resetAndClose = () => {
    form.resetFields();
    setOpen(false);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const values = await form.validateFields(); // triggers inline error states
      const id = "T-" + Math.floor(1000 + Math.random() * 9000);

      // optional: analytics event
      try {
        window?.analytics?.track?.("ticket_submitted", {
          priority: values.priority,
          hasMessage: !!values.message?.length,
        });
      } catch (_) {}

      setTickets((prev) => [
        {
          id,
          subject: values.subject.trim(),
          status: "open",
          priority: values.priority,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      message.success("Ticket created");
      resetAndClose();
    } catch (err) {
      // validation errors are shown inline by antd; no toast needed
    } finally {
      setCreating(false);
    }
  };

  // Disable OK button until form is valid (client-side)
  const okDisabled =
    !Form.useWatch("subject", form)?.trim()?.length ||
    !Form.useWatch("message", form)?.trim()?.length ||
    (Form.useWatch("message", form)?.trim()?.length || 0) < MSG_MIN;

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Tickets</h1>
            <p className="text-gray-600 m-0">
              Ask for help or report an issue.
            </p>
          </div>
          <Space>
            <Input.Search
              allowClear
              placeholder="Search subject or ticket id"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              New Ticket
            </Button>
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

        <Modal
          title="New Ticket"
          open={open}
          onCancel={resetAndClose}
          onOk={handleCreate}
          okText="Create"
          okButtonProps={{ loading: creating, disabled: okDisabled }}
          destroyOnClose
        >
          <Form
            layout="vertical"
            form={form}
            initialValues={{ subject: "", message: "", priority: "medium" }}
          >
            <Form.Item
              name="subject"
              label="Subject"
              rules={[
                { required: true, message: "Please enter a subject." },
                {
                  validator: (_, v) =>
                    v && v.trim().length > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("Subject cannot be empty.")),
                },
              ]}
            >
              <Input placeholder="Short summary (e.g., 'Invoice question')" />
            </Form.Item>

            {/* 🔒 Required free-text message with minimum length & errors */}
            <Form.Item
              name="message"
              label="Message"
              rules={[
                { required: true, message: "Please describe the issue." },
                {
                  min: MSG_MIN,
                  message: `Message must be at least ${MSG_MIN} characters.`,
                },
                {
                  validator: (_, v) => {
                    const len = (v || "").trim().length;
                    if (!len) return Promise.reject(new Error("Message is required."));
                    if (len < MSG_MIN)
                      return Promise.reject(
                        new Error(`Please provide at least ${MSG_MIN} characters.`)
                      );
                    return Promise.resolve();
                  },
                },
              ]}
              extra={`Minimum ${MSG_MIN} characters.`}
            >
              <TextArea
                rows={6}
                showCount
                maxLength={2000}
                placeholder="Provide details that help us resolve your issue quickly…"
              />
            </Form.Item>

            <Form.Item name="priority" label="Priority">
              <Select
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                className="w-full"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </GradientShell>
  );
}
