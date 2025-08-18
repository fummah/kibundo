import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Card, Form, Input, Space, Grid, Popconfirm,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, ReloadOutlined, DownloadOutlined } from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeDate, safe } from "@/utils/safe";

import { listSubjects, deleteSubject } from "@/pages/academics/_api";

const { useBreakpoint } = Grid;

export default function SubjectsList() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  // Quiet fetch: swallow errors and return empty shape
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["subjects", { page, pageSize, ...filters }],
    queryFn: async () => {
      try {
        return await listSubjects({ page, pageSize, ...filters });
      } catch {
        return { items: [], total: 0 };
      }
    },
    keepPreviousData: true
  });

  const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  const total = Number.isFinite(data?.total) ? data.total : items.length;

  const del = useMutation({
    mutationFn: (id) => deleteSubject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: () => {}
  });

  const columns = useMemo(() => [
    { title: "Name", dataIndex: "name", render: (v) => <SafeText value={v} /> },
    { title: "Code", dataIndex: "code", width: 140, render: (v) => <SafeText value={v} /> },
    { title: "Description", dataIndex: "description", ellipsis: true, render: (v) => <SafeText value={v} /> },
    { title: "Updated", dataIndex: "updated_at", width: 180, render: (iso) => <SafeDate value={iso} /> },
    {
      title: "Actions", key: "actions", width: 260, fixed: screens.md ? "right" : undefined,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => navigate(`/admin/academics/subjects/${r.id}`)}>View</Button>
          <Button size="small" onClick={() => navigate(`/admin/academics/subjects/${r.id}/edit`)}>Edit</Button>
          <Popconfirm title="Delete this subject?" onConfirm={() => del.mutate(r.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [navigate, del.isPending, screens.md]);

  const onExport = () => {
    const rows = (items ?? []).map(s => ({
      id: safe(s.id), name: safe(s.name), code: safe(s.code),
      description: safe(s.description), updated_at: safe(s.updated_at)
    }));
    const csv = [
      "id,name,code,description,updated_at",
      ...rows.map(r => [r.id,r.name,r.code,r.description,r.updated_at].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subjects.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Subjects"
        subtitle="Manage subjects used across curricula and quizzes."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/admin/academics/subjects/new")}>
              New Subject
            </Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form form={form} component={false} />
        <Form.Item name="q">
          <Input allowClear placeholder="Search by name/code…" style={{ width: 260 }} />
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
              No subjects yet — create one to get started.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
