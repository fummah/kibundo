// src/pages/parent/helpdesk/Tasks.jsx
import { useMemo, useState } from "react";
import { Card, List, Tag, Button, Segmented, Input, Modal, DatePicker, Select, Space, message } from "antd";
import { PlusOutlined, CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import GradientShell from "@/components/GradientShell";

const DUMMY = [
  { id: 1, title: "Review Math worksheet", due: dayjs().add(1, "day").toISOString(), status: "open", priority: "medium" },
  { id: 2, title: "Book parent-teacher meeting", due: dayjs().add(3, "day").toISOString(), status: "open", priority: "high" },
  { id: 3, title: "Check reading log", due: dayjs().subtract(1, "day").toISOString(), status: "done", priority: "low" },
];

const PRIORITY_TAG = {
  high: <Tag color="red">High</Tag>,
  medium: <Tag color="gold">Medium</Tag>,
  low: <Tag>Low</Tag>,
};

export default function Tasks() {
  const [tasks, setTasks] = useState(DUMMY);
  const [view, setView] = useState("open"); // open | done | all
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", priority: "medium", due: dayjs() });

  const filtered = useMemo(() => {
    const pool = view === "all" ? tasks : tasks.filter(t => view === "open" ? t.status === "open" : t.status === "done");
    const qt = q.trim().toLowerCase();
    return pool.filter(t => t.title.toLowerCase().includes(qt));
  }, [tasks, view, q]);

  const markDone = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "done" } : t));
  };

  const addTask = () => {
    if (!draft.title.trim()) return message.error("Please add a task title");
    setTasks(prev => [{ id: Date.now(), title: draft.title.trim(), due: draft.due.toISOString(), status: "open", priority: draft.priority }, ...prev]);
    setModalOpen(false);
    setDraft({ title: "", priority: "medium", due: dayjs() });
  };

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Tasks</h1>
            <p className="text-gray-600 m-0">Personal to-dos related to your children’s learning.</p>
          </div>
          <Space wrap>
            <Segmented value={view} onChange={setView} options={["open", "done", "all"]} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Task</Button>
          </Space>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <Input.Search
            allowClear
            placeholder="Search tasks"
            className="max-w-xl rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <List
            dataSource={filtered}
            renderItem={(t) => (
              <List.Item
                actions={[
                  t.status === "open" ? (
                    <Button key="done" icon={<CheckOutlined />} onClick={() => markDone(t.id)}>
                      Done
                    </Button>
                  ) : null,
                ]}
              >
                <List.Item.Meta
                  title={<span className="font-semibold">{t.title}</span>}
                  description={
                    <Space size="small" wrap>
                      {PRIORITY_TAG[t.priority]}
                      <span className="text-gray-500">Due {dayjs(t.due).format("MMM D, HH:mm")}</span>
                      <Tag color={t.status === "done" ? "green" : "default"}>{t.status}</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        <Modal
          title="Add Task"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={addTask}
          okText="Add"
        >
          <Space direction="vertical" className="w-full">
            <Input
              placeholder="Task title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <DatePicker
              showTime
              value={draft.due}
              onChange={(v) => setDraft((d) => ({ ...d, due: v || dayjs() }))}
              className="w-full"
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
