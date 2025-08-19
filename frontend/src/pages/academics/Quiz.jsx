// src/pages/academics/Quiz.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Drawer, Divider,
  Grid, Dropdown, Modal, Descriptions
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, MoreOutlined
} from "@ant-design/icons";
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

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  const createMut = useMutation({
    mutationFn: (payload) => createQuiz(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateQuiz(editId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); }
  });
  const del = useMutation({
    mutationFn: (id) => deleteQuiz(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); }
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishQuiz(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); }
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

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this quiz?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () =>
        del.mutate(id, {
          onSuccess: () => {
            if (viewRec?.id === id) setViewOpen(false);
          }
        })
    });
  };

  const columns = useMemo(() => [
    { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
    { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
    { title: "Grade", dataIndex: "grade", width: 90, render: (v) => <SafeText value={v} /> },
    { title: "State", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
    {
      title: "Difficulty", dataIndex: "difficulty", width: 120,
      render: (d) => (
        <Tag color={d === "easy" ? "green" : d === "hard" ? "volcano" : "geekblue"}>
          <SafeText value={d} />
        </Tag>
      )
    },
    {
      title: "Status", dataIndex: "status", width: 120,
      render: (s) => (
        <Tag color={s === "live" ? "green" : s === "review" ? "geekblue" : "default"}>
          <SafeText value={s} />
        </Tag>
      )
    },
    { title: "Tags", dataIndex: "tags", render: (tags) => <SafeTags value={tags} /> },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: screens.md ? "right" : undefined,
      render: (_, r) => {
        const isLive = r.status === "live";
        const menu = {
          items: [
            { key: "view", label: "View" },
            { type: "divider" },
            { key: "edit", label: "Edit" },
            { key: "toggle", label: isLive ? "Unpublish" : "Publish (live)" },
            { key: "delete", label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            if (key === "view") {
              setViewRec(r); setViewOpen(true);
            } else if (key === "edit") {
              openEdit(r);
            } else if (key === "toggle") {
              pub.mutate({ id: r.id, publish: !isLive });
            } else if (key === "delete") {
              confirmDelete(r.id);
            }
          }
        };
        return (
          <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              aria-label="More actions"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      }
    }
  ], [screens.md, pub.isPending, del.isPending]);

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

      {/* Create/Edit Drawer */}
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

      {/* View Drawer */}
      <Drawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Quiz"
        width={Math.min(680, typeof window !== "undefined" ? window.innerWidth - 32 : 680)}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => { setViewOpen(false); openEdit(viewRec); }}>Edit</Button>
              <Button onClick={() => pub.mutate({ id: viewRec.id, publish: viewRec.status !== "live" })}>
                {viewRec.status === "live" ? "Unpublish" : "Publish"}
              </Button>
              <Button danger onClick={() => confirmDelete(viewRec.id)}>Delete</Button>
            </Space>
          ) : null
        }
      >
        {viewRec ? (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Title"><SafeText value={viewRec.title} /></Descriptions.Item>
            <Descriptions.Item label="Bundesland"><SafeText value={viewRec.bundesland} /></Descriptions.Item>
            <Descriptions.Item label="Subject"><SafeText value={viewRec.subject} /></Descriptions.Item>
            <Descriptions.Item label="Grade"><SafeText value={viewRec.grade} /></Descriptions.Item>
            <Descriptions.Item label="Difficulty">
              <Tag color={viewRec.difficulty === "easy" ? "green" : viewRec.difficulty === "hard" ? "volcano" : "geekblue"}>
                <SafeText value={viewRec.difficulty} />
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={viewRec.status === "live" ? "green" : viewRec.status === "review" ? "geekblue" : "default"}>
                <SafeText value={viewRec.status} />
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tags"><SafeTags value={viewRec.tags} /></Descriptions.Item>
            <Descriptions.Item label="Description"><SafeText value={viewRec.description} /></Descriptions.Item>
            <Descriptions.Item label="Objectives"><SafeTags value={viewRec.objectives} /></Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );
}
