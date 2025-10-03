// src/pages/academics/worksheets/Worksheet.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Drawer, Divider,
  message, Grid, Result, Dropdown, Modal, Descriptions, Empty
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, ReloadOutlined, SaveOutlined, MoreOutlined } from "@ant-design/icons";

import api from "@/api/axios";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags } from "@/utils/safe";

const { useBreakpoint } = Grid;

// ---- Inline API helpers (no separate worksheets.js) ----
async function apiListWorksheets(params = {}) {
  const { page = 1, pageSize = 20, q, bundesland, subject, grade } = params;
  const res = await api.get("/worksheets", {
    params: { page, pageSize, q, bundesland, subject, grade },
  });
  const data = res?.data ?? {};
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (Array.isArray(data.items) && typeof data.total === "number") return data;
  if (Array.isArray(data.rows) && typeof data.count === "number") {
    return { items: data.rows, total: data.count };
  }
  const items = data.items || data.data || data.results || data.rows || [];
  const total =
    typeof data.total === "number"
      ? data.total
      : typeof data.count === "number"
      ? data.count
      : Array.isArray(items)
      ? items.length
      : 0;
  return { items, total };
}

async function apiCreateWorksheet(payload) {
  const res = await api.post("/addworksheet", payload);
  return res.data;
}

async function apiUpdateWorksheet(id, payload) {
  // If your backend upserts on POST /addworksheet with {id,...}
  const res = await api.post("/addworksheet", { id, ...payload });
  return res.data;
}

async function apiDeleteWorksheet(id) {
  const res = await api.delete(`/worksheet/${id}`);
  return res.data;
}

async function apiGetStates() {
  const res = await api.get("/states");
  const data = res?.data ?? [];
  // Expecting [{ id, state_name }, ...] but normalize defensively
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.rows)
    ? data.rows
    : [];
  return list.map((s) => ({
    id: s.id ?? s.state_id ?? s.value ?? s.code ?? s.name,
    name: s.state_name ?? s.name ?? s.label ?? s.title ?? String(s),
  }));
}

// If you still want a quick grade list without hitting another API:
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Worksheet() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  // ---- States (Bundesländer) from API ----
  const {
    data: states,
    isFetching: statesLoading,
    isError: statesError,
    error: statesErrorObj,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ["states"],
    queryFn: apiGetStates,
    staleTime: 5 * 60 * 1000,
  });

  // ---- Worksheets list ----
  const {
    data,
    isFetching,
    refetch,
    isError,
    error
  } = useQuery({
    queryKey: ["worksheets", { page, pageSize, ...filters }],
    queryFn: () => apiListWorksheets({ page, pageSize, ...filters }),
    keepPreviousData: true,
  });

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const createMut = useMutation({
    mutationFn: (payload) => apiCreateWorksheet(payload),
    onSuccess: () => {
      message.success("Worksheet created successfully");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      refetch();
      editForm.resetFields();
      setDrawerOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err?.message || "Failed to create worksheet");
    }
  });

  const updateMut = useMutation({
    mutationFn: (payload) => apiUpdateWorksheet(editId, payload),
    onSuccess: () => {
      message.success("Worksheet updated successfully");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      refetch();
      setDrawerOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err?.message || "Failed to update worksheet");
    }
  });

  const del = useMutation({
    mutationFn: (id) => apiDeleteWorksheet(id),
    onSuccess: () => {
      message.success("Worksheet deleted");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      if (viewOpen && viewRec && viewRec.id === editId) setViewOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete worksheet");
    }
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({ grade: 1, difficulty: "easy" });
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    // Ensure mapping if backend returns nested structures
    const patch = {
      ...r,
      bundesland: r.bundesland?.name || r.bundesland || r.state_name || r.state,
    };
    editForm.setFieldsValue(patch);
    setDrawerOpen(true);
  };

  const onSubmit = async () => {
    const values = await editForm.validateFields();
    if (editId) updateMut.mutate(values);
    else createMut.mutate(values);
  };

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this worksheet?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () => del.mutate(id),
    });
  };

  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 180, render: (v) => <SafeText value={v} /> },
      { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
      { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
      { title: "Grade", dataIndex: "grade", width: 90, render: (v) => <SafeText value={v} /> },
      { title: "State", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v?.name || v} /> },
      {
        title: "Difficulty",
        dataIndex: "difficulty",
        width: 120,
        render: (d) => (
          <Tag color={d === "easy" ? "green" : d === "hard" ? "volcano" : "geekblue"}>
            <SafeText value={d} />
          </Tag>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 80,
        fixed: screens.md ? "right" : undefined,
        render: (_, r) => {
          const menu = {
            items: [
              { key: "view", label: "View" },
              { type: "divider" },
              { key: "edit", label: "Edit" },
              { key: "delete", label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent?.stopPropagation?.();
              if (key === "view") { setViewRec(r); setViewOpen(true); }
              else if (key === "edit") { openEdit(r); }
              else if (key === "delete") { confirmDelete(r.id); }
            },
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
        },
      },
    ],
    [screens.md]
  );

  const bulkDeleteSelected = () => {
    if (!selectedRowKeys?.length) return;
    Modal.confirm({
      title: `Delete ${selectedRowKeys.length} selected worksheet(s)?`,
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: async () => {
        try {
          await Promise.all((selectedRowKeys || []).map((id) => apiDeleteWorksheet(id)));
          message.success("Selected worksheets deleted");
          setSelectedRowKeys([]);
          qc.invalidateQueries({ queryKey: ["worksheets"] });
          refetch();
        } catch (err) {
          message.error(err?.response?.data?.message || err?.message || "Failed to delete selected");
        }
      },
    });
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="p-4 bg-white rounded-lg shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Worksheets</h1>
            <p className="text-gray-500">Create and manage printable or interactive worksheets</p>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => { refetch(); refetchStates(); }} className="flex items-center">
              Refresh
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button danger onClick={bulkDeleteSelected}>
                Delete selected ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="flex items-center">
              New Worksheet
            </Button>
          </Space>
        </div>

        <Form form={form} layout="inline">
          <ResponsiveFilters>
            <Form.Item name="q">
              <Input placeholder="Search title/subject/tags…" allowClear style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="bundesland" label="State">
              <Select
                allowClear
                loading={statesLoading}
                options={(states || []).map((s) => ({ value: s.name, label: s.name }))}
                style={{ minWidth: 180 }}
                placeholder={statesError ? "Failed to load" : "Select state"}
              />
            </Form.Item>
            <Form.Item name="subject" label="Subject">
              <Input allowClear style={{ minWidth: 160 }} />
            </Form.Item>
            <Form.Item name="grade" label="Grade">
              <Select
                allowClear
                options={GRADES.map((g) => ({ value: g, label: `Grade ${g}` }))}
                style={{ minWidth: 120 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => form.resetFields()}>Reset</Button>
              </Space>
            </Form.Item>
          </ResponsiveFilters>
        </Form>
      </div>

      <div className="p-3 md:p-4">
        <Card styles={{ body: { padding: 0 } }} className="overflow-hidden">
          {isError ? (
            <Result status="error" title="Failed to load worksheets" subTitle={error?.message || "–"} />
          ) : (
            <>
              <FluidTable
                rowKey="id"
                loading={isFetching}
                dataSource={data?.items || []}
                columns={columns}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  preserveSelectedRowKeys: true,
                }}
                pagination={{
                  current: page,
                  pageSize,
                  total: data?.total ?? 0,
                  showSizeChanger: true,
                  onChange: (p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  },
                }}
                scroll={{ x: 900 }}
              />
              {!isFetching && (!data?.items || data.items.length === 0) && (
                <div className="py-10">
                  <Empty description="No worksheets found" />
                  {Boolean(form.getFieldValue('q') || form.getFieldValue('bundesland') || form.getFieldValue('subject') || form.getFieldValue('grade')) && (
                    <div className="text-center mt-2">
                      <Button size="small" onClick={() => { form.resetFields(); refetch(); }}>
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Worksheet" : "New Worksheet"}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        destroyOnHidden
        footer={
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>Close</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={createMut.isPending || updateMut.isPending}
                disabled={createMut.isPending || updateMut.isPending}
                onClick={onSubmit}
              >
                {editId ? "Save" : "Add"}
              </Button>
            </Space>
          </div>
        }
      >
        <Form layout="vertical" form={editForm} initialValues={{ grade: 1, difficulty: "easy" }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true }]}>
            <Select
              loading={statesLoading}
              options={(states || []).map((s) => ({ value: s.name, label: s.name }))}
              placeholder={statesError ? "Failed to load" : "Select state"}
            />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
            <Select options={GRADES.map((g) => ({ value: g, label: `Grade ${g}` }))} />
          </Form.Item>
          <Form.Item name="difficulty" label="Difficulty">
            <Select options={["easy", "medium", "hard"].map((d) => ({ value: d, label: d }))} />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags (Enter)" />
          </Form.Item>
          <Divider />
          <Form.Item name="content" label="Content (optional)">
            <Input.TextArea rows={6} placeholder="Paste worksheet text or a structured JSON later" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* View Drawer */}
      <Drawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Worksheet"
        width={Math.min(680, typeof window !== "undefined" ? window.innerWidth - 32 : 680)}
        extra={
          <Space>
            {viewRec && (
              <>
                <Button onClick={() => { setViewOpen(false); openEdit(viewRec); }}>Edit</Button>
                <Button danger onClick={() => confirmDelete(viewRec.id)}>Delete</Button>
              </>
            )}
          </Space>
        }
      >
        {viewRec ? (
          <>
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Title"><SafeText value={viewRec.title} /></Descriptions.Item>
              <Descriptions.Item label="Bundesland"><SafeText value={viewRec.bundesland?.name || viewRec.bundesland} /></Descriptions.Item>
              <Descriptions.Item label="Subject"><SafeText value={viewRec.subject} /></Descriptions.Item>
              <Descriptions.Item label="Grade"><SafeText value={viewRec.grade} /></Descriptions.Item>
              <Descriptions.Item label="Difficulty">
                <Tag color={viewRec.difficulty === "easy" ? "green" : viewRec.difficulty === "hard" ? "volcano" : "geekblue"}>
                  <SafeText value={viewRec.difficulty} />
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tags"><SafeTags value={viewRec.tags} /></Descriptions.Item>
              <Descriptions.Item label="Description"><SafeText value={viewRec.description} /></Descriptions.Item>
            </Descriptions>
            <Divider />
            <div className="whitespace-pre-wrap">
              <SafeText value={viewRec.content} />
            </div>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
