import React from "react";
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Select,
  Space,
  Grid,
  Modal,
  DatePicker,
  message,
} from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";

import QuizDrawer from "@/components/academics/QuizDrawer.jsx";
import QuizViewDrawer from "@/components/academics/QuizViewDrawer.jsx";

import { useQuizzes } from "@/hooks/academics/useQuizzes.js";
import { safe, safeJoin } from "@/utils/safe";
import { fromApiItem, toApiItem } from "@/utils/academics/transforms";

// Adjust this path if your constants live elsewhere:
import { BUNDESLAENDER, GRADES } from "@/pages/admin/academics/_constants";

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

export default function QuizPage() {
  const [filtersForm] = Form.useForm();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [viewRec, setViewRec] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const screens = useBreakpoint();

  const rawFilters = Form.useWatch([], filtersForm);

  // Normalize date filters to API-friendly params
  const filters = React.useMemo(() => {
    const f = { ...rawFilters };
    if (
      f?.created_range &&
      Array.isArray(f.created_range) &&
      f.created_range.length === 2
    ) {
      f.created_from =
        f.created_range[0]?.startOf?.("day")?.toISOString?.() ?? undefined;
      f.created_to =
        f.created_range[1]?.endOf?.("day")?.toISOString?.() ?? undefined;
    }
    delete f.created_range;
    return f;
  }, [rawFilters]);

  const { list, save, remove, publish, columns, columnMenuItems } = useQuizzes({
    page,
    pageSize,
    filters,
    screens,
    onView: (r) => {
      setViewRec(r);
      setViewOpen(true);
    },
    onEdit: openEdit,
    onDelete: (r) => onDelete(r),
    onTogglePublish: (r) =>
      publish.mutate({ id: r.id, publish: r.status !== "live" }),
  });

  const rows = Array.isArray(list.data?.items) ? list.data.items : [];
  const total = Number.isFinite(list.data?.total)
    ? list.data.total
    : rows.length;

  function openCreate() {
    setEditing({
      status: "draft",
      difficulty: "easy",
      grade: 1,
      objectives: [],
      description: "",
      items: [],
    });
    setEditorOpen(true);
  }

  function openEdit(r) {
    const rawItems = Array.isArray(r.items)
      ? r.items
      : Array.isArray(r.questions)
      ? r.questions
      : [];
    setEditing({ ...r, items: rawItems.map(fromApiItem) });
    setEditorOpen(true);
  }

  function onSubmit(values) {
    const editorItems = Array.isArray(values.items) ? values.items : [];
    const payload = {
      ...values,
      items: editorItems.map(toApiItem),
      ...(editing?.id ? { id: editing.id } : {}),
    };
    save.mutate(payload, {
      onSuccess: () => {
        setEditorOpen(false);
        setSelectedRowKeys([]);
      },
    });
  }

  function onDelete(r) {
    Modal.confirm({
      title: "Delete this quiz?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () =>
        remove.mutate(r.id, {
          onSuccess: () => {
            setViewOpen(false);
            setSelectedRowKeys((ks) => ks.filter((k) => k !== r.id));
          },
        }),
    });
  }

  function onExport() {
    const out = (rows ?? []).map((q) => ({
      id: safe(q.id),
      title: safe(q.title),
      subject: safe(q.subject),
      grade: safe(q.grade),
      bundesland: safe(q.bundesland),
      difficulty: safe(q.difficulty),
      status: safe(q.status),
      tags: safeJoin(q.tags, "|"),
      items_count: Array.isArray(q.items)
        ? q.items.length
        : Array.isArray(q.questions)
        ? q.questions.length
        : 0,
    }));
    const header =
      "id,title,subject,grade,bundesland,difficulty,status,tags,items_count";
    const csv = [
      header,
      ...out.map((r) =>
        [
          r.id,
          r.title,
          r.subject,
          r.grade,
          r.bundesland,
          r.difficulty,
          r.status,
          r.tags,
          r.items_count,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quizzes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Bulk actions ----
  const hasSelection = selectedRowKeys.length > 0;

  const bulkMenu = {
    items: [
      { key: "publish", label: "Publish selected" },
      { key: "unpublish", label: "Unpublish selected" },
      { type: "divider" },
      {
        key: "delete",
        label: <span style={{ color: "#ff4d4f" }}>Delete selected</span>,
      },
    ],
    onClick: async ({ key }) => {
      const ids = selectedRowKeys;
      if (!ids.length) return;
      if (key === "publish") {
        await Promise.all(
          ids.map((id) => publish.mutateAsync({ id, publish: true }))
        );
        message.success("Selected quizzes published");
      } else if (key === "unpublish") {
        await Promise.all(
          ids.map((id) => publish.mutateAsync({ id, publish: false }))
        );
        message.success("Selected quizzes unpublished");
      } else if (key === "delete") {
        Modal.confirm({
          title: `Delete ${ids.length} quizzes?`,
          content: "This action cannot be undone.",
          okType: "danger",
          okText: "Delete",
          onOk: async () => {
            await Promise.all(ids.map((id) => remove.mutateAsync(id)));
            message.success("Selected quizzes deleted");
            setSelectedRowKeys([]);
          },
        });
        return; // avoid clearing here; modal handles it
      }
      setSelectedRowKeys([]);
    },
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Quizzes"
        subtitle="Create, edit and publish quizzes."
        extra={
          <Space wrap>
            <Dropdown menu={{ items: columnMenuItems }} trigger={["click"]}>
              <Button>Columns</Button>
            </Dropdown>
            <Button icon={<ReloadOutlined />} onClick={() => list.refetch()} />
            {hasSelection ? (
              <Dropdown menu={bulkMenu} trigger={["click"]}>
                <Button>Bulk actions ({selectedRowKeys.length})</Button>
              </Dropdown>
            ) : null}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              New Quiz
            </Button>
          </Space>
        }
      />

      {/* Filters with padding top */}
      <div style={{ paddingTop: 20 }}>
        <ResponsiveFilters>
          <Form form={filtersForm} component={false} />
          <Form.Item name="q">
            <Input
              placeholder="Search title/tags…"
              allowClear
              style={{ width: 260 }}
            />
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
          <Form.Item name="status" label="Status">
            <Select
              allowClear
              options={["draft", "review", "live"].map((s) => ({
                value: s,
                label: s,
              }))}
              style={{ minWidth: 120 }}
            />
          </Form.Item>
          <Form.Item name="difficulty" label="Difficulty">
            <Select
              allowClear
              options={["easy", "medium", "hard"].map((d) => ({
                value: d,
                label: d,
              }))}
              style={{ minWidth: 140 }}
            />
          </Form.Item>
          <Form.Item name="created_range" label="Created">
            <RangePicker allowClear />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => filtersForm.resetFields()}>Reset</Button>
              <Button icon={<DownloadOutlined />} onClick={onExport}>
                Export CSV
              </Button>
            </Space>
          </Form.Item>
        </ResponsiveFilters>
      </div>

      <div className="p-3 md:p-4">
        <Card styles={{ body: { padding: 0 } }}>
          <FluidTable
            rowKey="id"
            loading={list.isFetching}
            columns={columns}
            dataSource={rows}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
          {!list.isFetching && rows.length === 0 && (
            <div className="px-6 py-8 text-sm text-gray-500">
              No quizzes yet — create one to get started.
            </div>
          )}
        </Card>
      </div>

      <QuizDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={onSubmit}
        saving={save.isPending}
        initialValues={
          editing || {
            status: "draft",
            difficulty: "easy",
            grade: 1,
            objectives: [],
            description: "",
            items: [],
          }
        }
        constants={{ BUNDESLAENDER, GRADES }}
      />

      <QuizViewDrawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        record={viewRec}
        onEdit={() => {
          setViewOpen(false);
          if (viewRec) openEdit(viewRec);
        }}
        onToggle={() =>
          viewRec &&
          publish.mutate({
            id: viewRec.id,
            publish: viewRec.status !== "live",
          })
        }
        onDelete={() => viewRec && onDelete(viewRec)}
      />
    </div>
  );
}
