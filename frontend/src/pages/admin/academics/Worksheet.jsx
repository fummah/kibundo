import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Drawer, Divider,
  message, Grid, Result, Dropdown, Modal, Descriptions
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, ReloadOutlined, SaveOutlined, MoreOutlined } from "@ant-design/icons";

import { BUNDESLAENDER, GRADES } from "./_constants";
import {
 listWorksheets,
 createWorksheet,
updateWorksheet,
deleteWorksheet,
} from "@/api/academics/worksheets";

import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags } from "@/utils/safe";

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
    keepPreviousData: true,
  });

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  const createMut = useMutation({
    mutationFn: (payload) => createWorksheet(payload),
    onSuccess: () => {
      message.success("Created");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      setDrawerOpen(false);
    },
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateWorksheet(editId, payload),
    onSuccess: () => {
      message.success("Updated");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      setDrawerOpen(false);
    },
  });
  const del = useMutation({
    mutationFn: (id) => deleteWorksheet(id),
    onSuccess: () => {
      message.success("Deleted");
      qc.invalidateQueries({ queryKey: ["worksheets"] });
      // close view drawer if it was open on the same record
      if (viewOpen && viewRec && viewRec.id === editId) setViewOpen(false);
    },
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({ grade: 1, difficulty: "easy" });
    setDrawerOpen(true);
  };
  const openEdit = (r) => {
    setEditId(r.id);
    editForm.setFieldsValue(r);
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
      { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
      { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
      { title: "Grade", dataIndex: "grade", width: 90, render: (v) => <SafeText value={v} /> },
      { title: "State", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
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
              if (key === "view") {
                setViewRec(r);
                setViewOpen(true);
              } else if (key === "edit") {
                openEdit(r);
              } else if (key === "delete") {
                confirmDelete(r.id);
              }
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

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Worksheets"
        subtitle="Create and manage printable/interactive worksheets."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New Worksheet
            </Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form form={form} component={false} />
        <Form.Item name="q">
          <Input placeholder="Search title/subject…" allowClear style={{ width: 260 }} />
        </Form.Item>
        <Form.Item name="bundesland" label="State">
          <Select
            allowClear
            options={BUNDESLAENDER.map((b) => ({ value: b, label: b }))}
            style={{ minWidth: 180 }}
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
          )}
        </Card>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Worksheet" : "New Worksheet"}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={createMut.isPending || updateMut.isPending}
              onClick={onSubmit}
            >
              {editId ? "Save" : "Create"}
            </Button>
          </Space>
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
            <Select options={BUNDESLAENDER.map((b) => ({ value: b, label: b }))} />
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
              <Descriptions.Item label="Bundesland"><SafeText value={viewRec.bundesland} /></Descriptions.Item>
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
