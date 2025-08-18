// src/pages/academics/Quiz.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Tooltip, message,
  Popconfirm, Drawer, Divider, Grid
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { BUNDESLAENDER, GRADES } from "./_constants";
import { listQuizzes, createQuiz, updateQuiz, deleteQuiz, publishQuiz } from "./_api";
import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags, safe, safeJoin } from "@/utils/safe";

const { useBreakpoint } = Grid;

export default function Quiz() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  // Quiet fetching: swallow errors and return empty shape
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["quizzes", { page, pageSize, ...filters }],
    queryFn: async () => {
      try {
        return await listQuizzes({ page, pageSize, ...filters });
      } catch {
        return { items: [], total: 0 };
      }
    },
    keepPreviousData: true
  });

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number.isFinite(data?.total) ? data.total : items.length;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const createMut = useMutation({
    mutationFn: (payload) => createQuiz(payload),
    onSuccess: () => { message.success("Quiz created"); qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); },
    onError: () => { /* keep quiet UI-wise */ }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateQuiz(editId, payload),
    onSuccess: () => { message.success("Quiz updated"); qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); },
    onError: () => { /* quiet */ }
  });
  const del = useMutation({
    mutationFn: (id) => deleteQuiz(id),
    onSuccess: () => { message.success("Deleted"); qc.invalidateQueries({ queryKey: ["quizzes"] }); },
    onError: () => { /* quiet */ }
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishQuiz(id, publish),
    onSuccess: () => { message.success("Status updated"); qc.invalidateQueries({ queryKey: ["quizzes"] }); },
    onError: () => { /* quiet */ }
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({ status: "draft", difficulty: "easy", grade: 1, objectives: [] });
    setDrawerOpen(true);
  };
  const openEdit = (r) => {
    setEditId(r.id);
    editForm.setFieldsValue({
      title: r.title, description: r.description, tags: r.tags || [],
      subject: r.subject, grade: r.grade, bundesland: r.bundesland,
      difficulty: r.difficulty || "medium", objectives: r.objectives || [],
      status: r.status || "draft"
    });
    setDrawerOpen(true);
  };

  const onSubmit = async () => {
    const values = await editForm.validateFields();
    if (editId) updateMut.mutate(values); else createMut.mutate(values);
  };

  const columns = useMemo(() => [
    { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
    { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
    { title: "Grade", dataIndex: "grade", width: 90, render: (v) => <SafeText value={v} /> },
    { title: "State", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
    { title: "Difficulty", dataIndex: "difficulty", width: 120, render: (d) => <Tag><SafeText value={d} /></Tag> },
    { title: "Status", dataIndex: "status", width: 120, render: (s) => <Tag color={s==="live"?"green":s==="review"?"geekblue":"default"}><SafeText value={s} /></Tag> },
    { title: "Tags", dataIndex: "tags", render: (tags) => <SafeTags value={tags} /> },
    {
      title: "Actions", key: "actions", width: 300, fixed: screens.md ? "right" : undefined,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Tooltip title={r.status === "live" ? "Unpublish" : "Publish (live)"}>
            <Button size="small" type={r.status === "live" ? "default" : "primary"}
              loading={pub.isPending}
              onClick={() => pub.mutate({ id: r.id, publish: r.status !== "live" })}
            >
              {r.status === "live" ? "Unpublish" : "Publish"}
            </Button>
          </Tooltip>
          <Popconfirm title="Delete this quiz?" onConfirm={() => del.mutate(r.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [pub.isPending, del.isPending, screens.md]);

  const onExport = () => {
    const rows = (items ?? []).map(q => ({
      id: safe(q.id), title: safe(q.title), subject: safe(q.subject),
      grade: safe(q.grade), bundesland: safe(q.bundesland),
      difficulty: safe(q.difficulty), status: safe(q.status),
      tags: safeJoin(q.tags, "|")
    }));
    const csv = [
      "id,title,subject,grade,bundesland,difficulty,status,tags",
      ...rows.map(r => [r.id,r.title,r.subject,r.grade,r.bundesland,r.difficulty,r.status,r.tags].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "quizzes.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Quizzes"
        subtitle="Create, review and publish quizzes. Filter by state, grade and subject."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Quiz</Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form form={form} component={false} />
        <Form.Item name="q"><Input placeholder="Search title/tags…" allowClear style={{ width: 260 }} /></Form.Item>
        <Form.Item name="bundesland" label="State">
          <Select allowClear options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} style={{ minWidth: 180 }} />
        </Form.Item>
        <Form.Item name="subject" label="Subject"><Input allowClear style={{ minWidth: 160 }} /></Form.Item>
        <Form.Item name="grade" label="Grade">
          <Select allowClear options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} style={{ minWidth: 120 }} />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select allowClear options={["draft","review","live"].map(s => ({ value: s, label: s }))} style={{ minWidth: 120 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
          </Space>
        </Form.Item>
      </ResponsiveFilters>

      <div className="p-3 md:p-4">
        <Card bodyStyle={{ padding: 0 }}>
          <FluidTable
            rowKey="id"
            loading={isFetching}
            columns={columns}
            dataSource={items}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); }
            }}
          />
          {!isFetching && items.length === 0 && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
              No quizzes yet — create one to get started.
            </div>
          )}
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Quiz" : "New Quiz"}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={createMut.isPending || updateMut.isPending} onClick={onSubmit}>
              {editId ? "Save" : "Create"}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={editForm} initialValues={{ status: "draft", difficulty: "easy", grade: 1, objectives: [] }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true }]}>
            <Select options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}><Select options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} /></Form.Item>
          <Form.Item name="difficulty" label="Difficulty">
            <Select options={["easy","medium","hard"].map(d => ({ value: d, label: d }))} />
          </Form.Item>
          <Form.Item name="objectives" label="Learning Goals"><Select mode="tags" placeholder="Add goals (Enter)" /></Form.Item>
          <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags (Enter)" /></Form.Item>
          <Divider />
          <Form.Item name="status" label="Status"><Select options={["draft","review","live"].map(s => ({ value: s, label: s }))} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
