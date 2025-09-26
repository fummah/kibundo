// src/pages/admin/academics/ocr/ScansOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Card, DatePicker, Dropdown, Drawer, Form, Input, Modal, Select,
  Space, Table, Tag, Typography, message, Checkbox, Divider
} from "antd";
import {
  EllipsisOutlined, FileSearchOutlined, PlusOutlined, SearchOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, SettingOutlined
} from "@ant-design/icons";
import OCRWorkspace from "@/pages/admin/academics/ocr/OCRWorkspace.jsx";

const { RangePicker } = DatePicker;

/* -------------------- helpers -------------------- */
const langLabel = (v) => (v === "deu" ? "German" : v === "eng" ? "English" : v || "—");
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
const getFileUrl = (file) => `/uploads/scans/${file}`;
const isImage = (name = "") => /\.(png|jpe?g|gif|webp)$/i.test(name);
const isPdf   = (name = "") => /\.pdf$/i.test(name);

/* Demo seed rows (use Tesseract codes: deu/eng) */
const initialRows = [
  {
    id: 101, student: "A. Moyo", class: "Grade 4", state: "BW", school: "Linden GS",
    file: "math_hw_101.jpg", uploadedAt: "2025-08-15 14:22", status: "Pending",
    language: "deu", description: "Worksheet—basic arithmetic", publisher: "Kibundo",
    timeToCompleteMins: 15, avgAttempts: 1.2, worksheetId: "math_hw_101"
  },
  {
    id: 102, student: "B. Dlamini", class: "Grade 6", state: "BY", school: "Sonnen Realschule",
    file: "science_sheet.pdf", uploadedAt: "2025-08-14 09:10", status: "Completed",
    language: "eng", description: "Science sheet: plants", publisher: "OpenEd",
    timeToCompleteMins: 22, avgAttempts: 1.0, worksheetId: "science_sheet"
  },
  {
    id: 103, student: "T. Ncube", class: "Grade 3", state: "HE", school: "Am Park GS",
    file: "reading_task.png", uploadedAt: "2025-08-13 16:05", status: "Failed",
    language: "deu", description: "Reading task—A1", publisher: "Kibundo",
    timeToCompleteMins: 10, avgAttempts: 1.6, worksheetId: "reading_task"
  },
];

/* -------------------- component -------------------- */
export default function ScansOverview() {
  const [data, setData] = useState(initialRows);
  const [status, setStatus] = useState();
  const [q, setQ] = useState("");
  const [dateRange, setDateRange] = useState();

  // Viewer & Editor
  const [viewerItem, setViewerItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  // OCR Drawer
  const [ocrOpen, setOcrOpen] = useState(false);

  // Column chooser
  const COLS_LS_KEY = "scans.visibleCols.v1";
  const defaultVisible = [
    "id", "student", "class", "state", "school",
    "file", "uploadedAt", "status", "language",
    "description", "publisher", "timeToCompleteMins",
    "avgAttempts", "matches"
  ];
  const readCols = () => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      const parsed = JSON.parse(raw || "null");
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return defaultVisible.slice();
  };
  const [visibleCols, setVisibleCols] = useState(readCols);
  const [colModalOpen, setColModalOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(COLS_LS_KEY, JSON.stringify(Array.from(new Set(visibleCols)))); } catch {}
  }, [visibleCols]);

  /* derived rows (filters) */
  const rows = useMemo(() => {
    const inRange = (iso) => {
      if (!dateRange || dateRange.length !== 2) return true;
      const ts = new Date(iso).getTime();
      const start = dateRange[0]?.startOf?.("day")?.toDate?.() ?? dateRange[0];
      const end = dateRange[1]?.endOf?.("day")?.toDate?.() ?? dateRange[1];
      return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
    };
    return data.filter((r) => {
      const text = `${r.student ?? ""} ${r.class ?? ""} ${r.file ?? ""} ${r.description ?? ""} ${r.publisher ?? ""}`.toLowerCase();
      const textMatch = !q || text.includes(q.toLowerCase());
      const statusMatch = !status || r.status === status;
      const dateMatch = !r.uploadedAt || inRange(r.uploadedAt);
      return textMatch && statusMatch && dateMatch;
    });
  }, [data, status, q, dateRange]);

  const totalScans = data.length;

  /* actions */
  const onView = (rec) => setViewerItem(rec);
  const onEdit = (rec) => { setEditItem(rec); form.setFieldsValue(rec); setEditOpen(true); };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      setData((prev) =>
        prev.map((r) => (r.id === editItem.id ? { ...r, ...values } : r))
      );
      message.success("Scan updated.");
      setEditOpen(false);
      setEditItem(null);
    } catch (error) {
      console.error("Validation Failed:", error);
    }
  };
  const onDelete = (rec) => {
    Modal.confirm({
      title: `Delete scan #${rec.id}?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        setData((prev) => prev.filter((r) => r.id !== rec.id));
        message.success("Scan deleted.");
      },
    });
  };

  /* matches helper (same worksheet uploaded) */
  const countMatches = (wsId) =>
    wsId ? Math.max(0, data.filter((r) => r.worksheetId === wsId).length - 1) : 0;

  /* columns map (for show/hide) */
  const ALL_COLUMNS_MAP = useMemo(() => {
    return {
      id: {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 80,
      },
      student: {
        title: "Student",
        dataIndex: "student",
        key: "student",
        render: (v) => v || "—",
      },
      class: {
        title: "Class / Grade",
        key: "class",
        render: (_, r) => r.class || r.classGrade || "—",
        width: 140,
      },
      state: {
        title: "State",
        dataIndex: "state",
        key: "state",
        width: 100,
      },
      school: {
        title: "School",
        dataIndex: "school",
        key: "school",
        width: 180,
      },
      file: {
        title: "File",
        dataIndex: "file",
        key: "file",
        render: (f) =>
          f ? (
            <a href={getFileUrl(f)} target="_blank" rel="noreferrer">
              {f}
            </a>
          ) : (
            "—"
          ),
        width: 220,
      },
      uploadedAt: {
        title: "Uploaded",
        dataIndex: "uploadedAt",
        key: "uploadedAt",
        render: (d) => fmt(d),
        width: 180,
      },
      status: {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (s) => (
          <Tag color={s === "Completed" ? "green" : s === "Failed" ? "red" : "gold"}>
            {s || "—"}
          </Tag>
        ),
        width: 120,
      },
      language: {
        title: "OCR Lang",
        dataIndex: "language",
        key: "language",
        render: (v) => langLabel(v),
        width: 110,
      },
      description: {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (v) => v || "—",
      },
      publisher: {
        title: "Publisher",
        dataIndex: "publisher",
        key: "publisher",
        width: 140,
      },
      timeToCompleteMins: {
        title: "Time (mins)",
        dataIndex: "timeToCompleteMins",
        key: "timeToCompleteMins",
        render: (v) => (v === 0 || v ? v : "—"),
        width: 120,
      },
      avgAttempts: {
        title: "Avg. attempts",
        dataIndex: "avgAttempts",
        key: "avgAttempts",
        render: (v) => (v === 0 || v ? v : "—"),
        width: 130,
      },
      matches: {
        title: "Matches",
        key: "matches",
        render: (_, r) => countMatches(r.worksheetId),
        width: 110,
      },
    };
  }, [data]);

  let columns = [...visibleCols.map((k) => ALL_COLUMNS_MAP[k]).filter(Boolean)];
  if (!columns.length) {
    columns = [{ title: "—", key: "__placeholder__", render: () => "—" }];
  }

  // AntD v5: use menu.onClick for Dropdown actions
  const actionItems = [
    { key: "view", icon: <EyeOutlined />, label: "View" },
    { key: "edit", icon: <EditOutlined />, label: "Edit" },
    { key: "delete", icon: <DeleteOutlined />, label: <span className="text-red-600">Delete</span> },
  ];

  columns.push({
    title: "",
    key: "actions",
    align: "right",
    width: 60,
    render: (_, rec) => (
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        arrow
        menu={{
          items: actionItems,
          onClick: ({ key }) => {
            if (key === "view") onView(rec);
            else if (key === "edit") onEdit(rec);
            else if (key === "delete") onDelete(rec);
          },
        }}
      >
        <Button type="text" shape="circle" aria-label="Actions" icon={<EllipsisOutlined />} />
      </Dropdown>
    ),
  });

  /* filtered status counts (simple demo KPIs) */
  const pending7d = 7; // placeholders—replace with real stats if needed
  const completed7d = 42;
  const failed7d = 3;

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
          <FileSearchOutlined /> Homework / Scans
        </Typography.Title>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setColModalOpen(true)}>
            Columns
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOcrOpen(true)}>
            Add OCR Job
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-gray-500 text-sm">Total scans</div>
          <div className="text-3xl font-bold mt-1">{totalScans}</div>
        </Card>
        <Card>
          <div className="text-gray-500 text-sm">Pending</div>
          <div className="text-3xl font-bold mt-1">{pending7d}</div>
        </Card>
        <Card>
          <div className="text-gray-500 text-sm">Completed (7d)</div>
          <div className="text-3xl font-bold mt-1">{completed7d}</div>
        </Card>
        <Card>
          <div className="text-gray-500 text-sm">Failed (7d)</div>
          <div className="text-3xl font-bold mt-1">{failed7d}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by student, class, file, description, publisher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 320 }}
              allowClear
            />
            <Select
              placeholder="Status"
              value={status}
              onChange={setStatus}
              allowClear
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Completed", label: "Completed" },
                { value: "Failed", label: "Failed" },
              ]}
              style={{ width: 180 }}
            />
            <RangePicker value={dateRange} onChange={setDateRange} />
          </Space>

          <Space>
            <Button
              onClick={() => {
                setQ(""); setStatus(undefined); setDateRange(undefined);
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

        <div className="mt-4">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      {/* VIEWER MODAL */}
      <Modal
        open={!!viewerItem}
        title={viewerItem ? `View Scan #${viewerItem.id}` : ""}
        footer={null}
        onCancel={() => setViewerItem(null)}
        width={900}
      >
        {viewerItem && (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              <div><strong>Student:</strong> {viewerItem.student || "—"}</div>
              <div><strong>Class / Grade:</strong> {viewerItem.class || viewerItem.classGrade || "—"}</div>
              <div><strong>State:</strong> {viewerItem.state || "—"}</div>
              <div><strong>School:</strong> {viewerItem.school || "—"}</div>
              <div><strong>File:</strong> {viewerItem.file || "—"}</div>
              <div><strong>Uploaded:</strong> {fmt(viewerItem.uploadedAt)}</div>
              <div><strong>Status:</strong> {viewerItem.status}</div>
              <div><strong>OCR Language:</strong> {langLabel(viewerItem.language)}</div>
              <div><strong>Description:</strong> {viewerItem.description || "—"}</div>
              <div><strong>Publisher:</strong> {viewerItem.publisher || "—"}</div>
              <div><strong>Time to complete (mins):</strong> {viewerItem.timeToCompleteMins ?? "—"}</div>
              <div><strong>Avg. attempts:</strong> {viewerItem.avgAttempts ?? "—"}</div>
              <div><strong>Worksheet ID:</strong> {viewerItem.worksheetId || "—"}</div>
              <div><strong>Matches:</strong> {countMatches(viewerItem.worksheetId)}</div>
            </div>
            <div className="border rounded-md p-2">
              {isImage(viewerItem.file) ? (
                <img
                  src={getFileUrl(viewerItem.file)}
                  alt={viewerItem.file}
                  style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
                />
              ) : isPdf(viewerItem.file) ? (
                <iframe
                  title="PDF Preview"
                  src={`${getFileUrl(viewerItem.file)}#toolbar=0`}
                  style={{ width: "100%", height: "70vh", border: 0 }}
                />
              ) : (
                <Typography.Text type="secondary">
                  Preview unavailable.{" "}
                  <a href={getFileUrl(viewerItem.file)} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </Typography.Text>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setViewerItem(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        title={editItem ? `Edit Scan #${editItem.id}` : "Edit Scan"}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSubmit}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="student" label="Student" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="class" label="Class / Grade" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="state" label="State">
            <Input />
          </Form.Item>
          <Form.Item name="school" label="School">
            <Input />
          </Form.Item>
          <Form.Item name="file" label="File name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Completed", label: "Completed" },
                { value: "Failed", label: "Failed" },
              ]}
            />
          </Form.Item>
          <Form.Item name="language" label="OCR Language">
            <Select
              options={[
                { value: "deu", label: "German (deu)" },
                { value: "eng", label: "English (eng)" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item name="publisher" label="Publisher">
            <Input />
          </Form.Item>
          <Form.Item name="timeToCompleteMins" label="Time to complete (mins)">
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="avgAttempts" label="Average attempts">
            <Input type="number" min={0} step="0.1" />
          </Form.Item>
          <Form.Item name="worksheetId" label="Worksheet ID">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* OCR WORKSPACE DRAWER (inline) */}
      <Drawer
        title="OCR Workspace"
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        width={980}
        destroyOnClose
      >
        {ocrOpen && (
          <OCRWorkspace
            defaultLanguage="deu" // German
            onClose={() => setOcrOpen(false)}
            onComplete={(job) => {
              // Save into table, compute ID and timestamp
              const nextId = (data.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1;
              const newRow = {
                id: nextId,
                student: job.student || "—",
                class: job.class || job.classGrade || "—",
                state: job.state || "—",
                school: job.school || "—",
                file: job.fileName || "scan.pdf",
                uploadedAt: new Date().toISOString(),
                status: "Completed",
                language: job.language || "deu",
                description: job.description || "",
                publisher: job.publisher || "",
                timeToCompleteMins: job.timeToCompleteMins ?? null,
                avgAttempts: job.avgAttempts ?? null,
                worksheetId: job.worksheetId || undefined,
              };
              setData((prev) => [newRow, ...prev]);
              message.success("OCR job saved.");
              setOcrOpen(false);
            }}
          />
        )}
      </Drawer>

      {/* COLUMNS MODAL */}
      <Modal
        title="Show / Hide columns"
        open={colModalOpen}
        onCancel={() => setColModalOpen(false)}
        onOk={() => setColModalOpen(false)}
        okText="Done"
      >
        <div className="mb-2">
          <Space wrap>
            <Button onClick={() => setVisibleCols(Object.keys(ALL_COLUMNS_MAP))}>Select all</Button>
            <Button onClick={() => setVisibleCols(defaultVisible.slice())}>Reset</Button>
          </Space>
        </div>

        {(() => {
          const entries = Object.keys(ALL_COLUMNS_MAP).map((k) => ({
            key: k,
            title: ALL_COLUMNS_MAP[k].title || k,
          }));

          const counts = entries.reduce((acc, e) => {
            acc[e.title] = (acc[e.title] || 0) + 1;
            return acc;
          }, {});

          const options = entries.map((e) => ({
            value: e.key,
            label: counts[e.title] > 1 ? `${e.title} (${e.key})` : e.title,
          }));

          return (
            <Checkbox.Group
              value={Array.from(new Set(visibleCols))}
              onChange={(vals) => setVisibleCols(Array.from(new Set(vals)))}
              className="grid grid-cols-1 sm:grid-cols-2 gap-y-2"
              options={options}
            />
          );
        })()}

        <Divider />
        <Typography.Text type="secondary" className="block">
          “Actions” is always visible.
        </Typography.Text>
      </Modal>
    </Space>
  );
}
