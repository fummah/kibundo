import React, { useMemo, useState } from "react";
import {
  Button, Card, DatePicker, Dropdown, Drawer, Form, Input, Modal, Select,
  Space, Table, Tag, Typography, message
} from "antd";
import {
  EllipsisOutlined, FileSearchOutlined, PlusOutlined, SearchOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined
} from "@ant-design/icons";
// If your OCR workspace is a component, import it:
import OCRWorkspace from "@/pages/ocr/OCRWorkspace.jsx"; // opened inline in a Drawer

const { RangePicker } = DatePicker;

const initialRows = [
  { id: 101, student: "A. Moyo",   class: "Grade 4", file: "math_hw_101.jpg",   uploadedAt: "2025-08-15 14:22", status: "Pending" },
  { id: 102, student: "B. Dlamini", class: "Grade 6", file: "science_sheet.pdf", uploadedAt: "2025-08-14 09:10", status: "Completed" },
  { id: 103, student: "T. Ncube",   class: "Grade 3", file: "reading_task.png",  uploadedAt: "2025-08-13 16:05", status: "Failed" },
];

// Resolve where your files are served from
const getFileUrl = (file) => `/uploads/scans/${file}`;
const isImage = (name) => /\.(png|jpe?g|gif|webp)$/i.test(name);
const isPdf   = (name) => /\.pdf$/i.test(name);

export default function ScansOverview() {
  const [data, setData] = useState(initialRows);
  const [status, setStatus] = useState();
  const [q, setQ] = useState("");

  // Viewer & Editor state
  const [viewerItem, setViewerItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  // OCR Drawer state
  const [ocrOpen, setOcrOpen] = useState(false);

  const rows = useMemo(() => {
    return data.filter(r =>
      (!status || r.status === status) &&
      (!q || `${r.student} ${r.class} ${r.file}`.toLowerCase().includes(q.toLowerCase()))
    );
  }, [data, status, q]);

  const onView = (rec) => setViewerItem(rec);

  const onEdit = (rec) => {
    setEditItem(rec);
    form.setFieldsValue(rec);
    setEditOpen(true);
  };

  const onDelete = (rec) => {
    Modal.confirm({
      title: `Delete homework #${rec.id}?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => {
        setData(prev => prev.filter(r => r.id !== rec.id));
        message.success("Homework deleted.");
      },
    });
  };

  const columns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Student", dataIndex: "student" },
    { title: "Class", dataIndex: "class" },
    { title: "File", dataIndex: "file" },
    { title: "Uploaded", dataIndex: "uploadedAt" },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => (
        <Tag color={s === "Completed" ? "green" : s === "Failed" ? "red" : "gold"}>{s}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 60,
      render: (_, rec) => {
        const items = [
          { key: "view",   icon: <EyeOutlined />,  label: "View",   onClick: () => onView(rec) },
          { key: "edit",   icon: <EditOutlined />, label: "Edit",   onClick: () => onEdit(rec) },
          { key: "delete", icon: <DeleteOutlined />, label: <span className="text-red-600">Delete</span>, onClick: () => onDelete(rec) },
        ];
        return (
          <Dropdown trigger={["click"]} placement="bottomRight" arrow menu={{ items }}>
            <Button type="text" shape="circle" aria-label="Actions" icon={<EllipsisOutlined />} />
          </Dropdown>
        );
      },
    },
  ], []);

  const handleEditSubmit = async () => {
    const vals = await form.validateFields();
    setData(prev => prev.map(r => (r.id === editItem.id ? { ...r, ...vals } : r)));
    setEditOpen(false);
    message.success("Homework updated.");
  };

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
          <FileSearchOutlined /> Homework / Scans
        </Typography.Title>
        <Space>
          {/* Open OCR workspace INSIDE this page */}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOcrOpen(true)}>
            Add OCR Job
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-gray-500 text-sm">Pending</div><div className="text-3xl font-bold mt-1">7</div></Card>
        <Card><div className="text-gray-500 text-sm">Completed (7d)</div><div className="text-3xl font-bold mt-1">42</div></Card>
        <Card><div className="text-gray-500 text-sm">Failed (7d)</div><div className="text-3xl font-bold mt-1">3</div></Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by student, class, file…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 300 }}
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
            <RangePicker />
          </Space>

          <Space>
            <Button onClick={() => { setQ(""); setStatus(undefined); }}>Reset</Button>
          </Space>
        </div>

        <div className="mt-4">
          <Table rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} />
        </div>
      </Card>

      {/* VIEWER MODAL */}
      <Modal
        open={!!viewerItem}
        title={viewerItem ? `View Homework #${viewerItem.id}` : ""}
        footer={null}
        onCancel={() => setViewerItem(null)}
        width={900}
      >
        {viewerItem && (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              <div><strong>Student:</strong> {viewerItem.student}</div>
              <div><strong>Class:</strong> {viewerItem.class}</div>
              <div><strong>File:</strong> {viewerItem.file}</div>
              <div><strong>Uploaded:</strong> {viewerItem.uploadedAt}</div>
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
        title={editItem ? `Edit Homework #${editItem.id}` : "Edit Homework"}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSubmit}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="student" label="Student" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="class" label="Class" rules={[{ required: true }]}>
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
        {/* Only mount when open to avoid heavy init costs */}
        {ocrOpen && (
          <OCRWorkspace
            onClose={() => setOcrOpen(false)}
            onComplete={(job) => {
              // Optionally refresh table or show toast
              message.success("OCR job created.");
              setOcrOpen(false);
              // TODO: refresh data from backend if needed
            }}
          />
        )}
      </Drawer>
    </Space>
  );
}
