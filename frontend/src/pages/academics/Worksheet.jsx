import React, { useMemo, useState } from "react";
import { Button, Card, Flex, Form, Input, Select, Space, Tag, Popconfirm, Drawer, Divider, message, Grid, Result } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { BUNDESLAENDER, GRADES } from "./_constants";
import { listWorksheets, createWorksheet, updateWorksheet, deleteWorksheet } from "./_api";
import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags, safe } from "@/utils/safe";

const { useBreakpoint } = Grid;

export default function Worksheet() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  const { data, isFetching, refetch, isError, error } = useQuery({
    queryKey: ["worksheets", { page, pageSize, ...filters }],
    queryFn: () => listWorksheets({ page, pageSize, ...filters }),
    keepPreviousData: true
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const createMut = useMutation({
    mutationFn: (payload) => createWorksheet(payload),
    onSuccess: () => { message.success("Created"); qc.invalidateQueries({ queryKey: ["worksheets"] }); setDrawerOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateWorksheet(editId, payload),
    onSuccess: () => { message.success("Updated"); qc.invalidateQueries({ queryKey: ["worksheets"] }); setDrawerOpen(false); }
  });
  const del = useMutation({
    mutationFn: (id) => deleteWorksheet(id),
    onSuccess: () => { message.success("Deleted"); qc.invalidateQueries({ queryKey: ["worksheets"] }); }
  });

  const openCreate = () => {
    setEditId(null); editForm.resetFields();
    editForm.setFieldsValue({ grade: 1, difficulty: "easy" });
    setDrawerOpen(true);
  };
  const openEdit = (r) => { setEditId(r.id); editForm.setFieldsValue(r); setDrawerOpen(true); };

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
      title: "Actions", key: "actions", width: 220, fixed: screens.md ? "right" : undefined, render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete this worksheet?" onConfirm={() => del.mutate(r.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [del.isPending, screens.md]);

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Worksheets"
        subtitle="Create and manage printable/interactive worksheets."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Worksheet</Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form form={form} component={false} />
        <Form.Item name="q"><Input placeholder="Search title/subject…" allowClear style={{ width: 260 }} /></Form.Item>
        <Form.Item name="bundesland" label="State">
          <Select allowClear options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} style={{ minWidth: 180 }} />
        </Form.Item>
        <Form.Item name="subject" label="Subject"><Input allowClear style={{ minWidth: 160 }} /></Form.Item>
        <Form.Item name="grade" label="Grade">
          <Select allowClear options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} style={{ minWidth: 120 }} />
        </Form.Item>
      </ResponsiveFilters>

      <div className="p-3 md:p-4">
        <Card bodyStyle={{ padding: 0 }}>
          {isError ? (
            <Result status="error" title="Failed to load worksheets" subTitle={error?.message || "–"} />
          ) : (
            <FluidTable
              rowKey="id"
              loading={isFetching}
              dataSource={data?.items || []}
              columns={columns}
              pagination={{
                current: page, pageSize, total: data?.total ?? 0, showSizeChanger: true,
                onChange: (p, ps) => { setPage(p); setPageSize(ps); }
              }}
              scroll={{ x: 900 }}
            />
          )}
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Worksheet" : "New Worksheet"}
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
        <Form layout="vertical" form={editForm} initialValues={{ grade: 1, difficulty: "easy" }}>
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
          <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags (Enter)" /></Form.Item>
          <Divider />
          <Form.Item name="content" label="Content (optional)">
            <Input.TextArea rows={6} placeholder="Paste worksheet text or a structured JSON later" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
