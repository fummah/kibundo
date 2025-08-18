// src/pages/academics/Game.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Tooltip,
  Popconfirm, Drawer, Divider, Grid
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags, SafeDate, safe, safeJoin } from "@/utils/safe";

import { BUNDESLAENDER, GRADES } from "./_constants";

const { useBreakpoint } = Grid;

/**
 * Optional backend endpoints (quietly failing-safe).
 * If your API is not implemented yet, these will just keep the UI empty
 * with no errors shown.
 */
const API = (p) => `/api${p}`;

async function _buildUrl(path, params = {}) {
  const url = new URL(API(path), window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, val));
    else if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v));
  });
  return url.toString();
}

// ---- Quiet API helpers (swallow errors, return empty/neutral shapes) ----
async function listGames(params = {}) {
  try {
    const url = await _buildUrl("/games", params);
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error();
    return await res.json(); // expected { items: [], total: number }
  } catch {
    return { items: [], total: 0 };
  }
}
async function createGame(payload) {
  try {
    const res = await fetch(API(`/games`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}
async function updateGame(id, payload) {
  try {
    const res = await fetch(API(`/games/${id}`), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}
async function deleteGame(id) {
  try {
    const res = await fetch(API(`/games/${id}`), {
      method: "DELETE",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    return true;
  } catch {
    return false;
  }
}
async function publishGame(id, publish) {
  try {
    const res = await fetch(API(`/games/${id}/${publish ? "publish" : "unpublish"}`), {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

export default function Game() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  // Quiet fetching (no error banners)
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["games", { page, pageSize, ...filters }],
    queryFn: () => listGames({ page, pageSize, ...filters }),
    keepPreviousData: true
  });

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number.isFinite(data?.total) ? data.total : items.length;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Mutations (quiet on error)
  const createMut = useMutation({
    mutationFn: (payload) => createGame(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["games"] }); setDrawerOpen(false); },
    onError: () => {}
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateGame(editId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["games"] }); setDrawerOpen(false); },
    onError: () => {}
  });
  const del = useMutation({
    mutationFn: (id) => deleteGame(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["games"] }); },
    onError: () => {}
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishGame(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["games"] }); },
    onError: () => {}
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      status: "draft",
      difficulty: "easy",
      grade: 1,
      tags: [],
      objectives: []
    });
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    editForm.setFieldsValue({
      title: r.title,
      description: r.description,
      tags: r.tags || [],
      subject: r.subject,
      grade: r.grade,
      bundesland: r.bundesland,
      difficulty: r.difficulty || "medium",
      objectives: r.objectives || [],
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
    {
      title: "Status", dataIndex: "status", width: 120,
      render: (s) => <Tag color={s==="live"?"green":s==="review"?"geekblue":"default"}><SafeText value={s} /></Tag>
    },
    { title: "Tags", dataIndex: "tags", render: (tags) => <SafeTags value={tags} /> },
    { title: "Updated", dataIndex: "updated_at", width: 200, render: (iso) => <SafeDate value={iso} /> },
    {
      title: "Actions", key: "actions", width: 320, fixed: screens.md ? "right" : undefined,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Tooltip title={r.status === "live" ? "Unpublish" : "Publish (live)"}>
            <Button
              size="small"
              type={r.status === "live" ? "default" : "primary"}
              loading={pub.isPending}
              onClick={() => pub.mutate({ id: r.id, publish: r.status !== "live" })}
            >
              {r.status === "live" ? "Unpublish" : "Publish"}
            </Button>
          </Tooltip>
          <Popconfirm title="Delete this game?" onConfirm={() => del.mutate(r.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [pub.isPending, del.isPending, screens.md]);

  const onExport = () => {
    const rows = (items ?? []).map(g => ({
      id: safe(g.id), title: safe(g.title), subject: safe(g.subject),
      grade: safe(g.grade), bundesland: safe(g.bundesland),
      difficulty: safe(g.difficulty), status: safe(g.status),
      tags: safeJoin(g.tags, "|"), updated_at: safe(g.updated_at)
    }));
    const csv = [
      "id,title,subject,grade,bundesland,difficulty,status,tags,updated_at",
      ...rows.map(r => [r.id,r.title,r.subject,r.grade,r.bundesland,r.difficulty,r.status,r.tags,r.updated_at].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "games.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Games"
        subtitle="Create, review and publish interactive learning games."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Game</Button>
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
          <Select allowClear options={["draft","review","live"].map(s => ({ value: s, label: s }))} style={{ minWidth: 140 }} />
        </Form.Item>
        <Form.Item>
          <Button onClick={() => form.resetFields()}>Reset</Button>
        </Form.Item>
      </ResponsiveFilters>

      <div className="p-3 md:p-4">
        <Card bodyStyle={{ padding: 0 }} className="overflow-hidden">
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
              No games yet — create one to get started.
            </div>
          )}
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Game" : "New Game"}
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
        <Form
          layout="vertical"
          form={editForm}
          initialValues={{ status: "draft", difficulty: "easy", grade: 1, objectives: [], tags: [] }}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={4} /></Form.Item>

          <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true }]}>
            <Select options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
            <Select options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} />
          </Form.Item>

          <Form.Item name="difficulty" label="Difficulty">
            <Select options={["easy","medium","hard"].map(d => ({ value: d, label: d }))} />
          </Form.Item>
          <Form.Item name="objectives" label="Learning Goals">
            <Select mode="tags" placeholder="Add goals (Enter)" />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags (Enter)" />
          </Form.Item>

          <Divider />

          <Form.Item name="status" label="Status">
            <Select options={["draft","review","live"].map(s => ({ value: s, label: s }))} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
