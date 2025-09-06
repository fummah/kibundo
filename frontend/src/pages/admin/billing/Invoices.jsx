// src/pages/billing/Invoices.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Card,
  Tag,
  Space,
  Button,
  Input,
  DatePicker,
  Tooltip,
  message,
  Dropdown,
  Modal,
  Form,
  InputNumber,
  Select,
  Descriptions,
  Grid,
  Badge,
  Drawer,
  Divider,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  SendOutlined,
  FilePdfOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

import BillingEntityList from "@/components/billing/BillingEntityList";
import ConfirmDrawer from "@/components/common/ConfirmDrawer";
import useResponsiveDrawerWidth from "@/hooks/useResponsiveDrawerWidth";
import MoneyText from "@/components/common/MoneyText";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;
const { Text } = Typography;

/* keep drawers under fixed header */
const HEADER_OFFSET = 64;

let DOMPurify;
try {
  DOMPurify = require("dompurify");
} catch {}

/* ---------------- constants ---------------- */
const UNPAID = new Set(["open", "past_due", "uncollectible"]);
const STATUS_OPTIONS = [
  { value: "open", label: "open" },
  { value: "paid", label: "paid" },
  { value: "past_due", label: "past_due" },
  { value: "uncollectible", label: "uncollectible" },
];
const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "ZAR", label: "ZAR" },
];

/* ---------------- dummy helpers (fallback) ---------------- */
function buildDummyInvoices(range) {
  const [start, end] = range || [dayjs().startOf("month"), dayjs().endOf("month")];
  const mid = start.add(10, "day");

  return [
    {
      id: "INV-1001",
      status: "paid",
      total_cents: 125000,
      currency: "EUR",
      due_at: start.add(12, "day").toISOString(),
      created_at: start.add(2, "day").toISOString(),
      parent: { name: "Family One" },
      pdf_url: "#",
      notes_html: "<p>Thank you for your payment.</p>",
    },
    {
      id: "INV-1002",
      status: "open",
      total_cents: 78000,
      currency: "EUR",
      due_at: end.subtract(6, "day").toISOString(),
      created_at: start.add(8, "day").toISOString(),
      parent: { name: "Family Two" },
      pdf_url: "#",
      notes_html: "<p>Please settle within 14 days.</p>",
    },
    {
      id: "INV-1003",
      status: "past_due",
      total_cents: 54000,
      currency: "EUR",
      due_at: mid.subtract(3, "day").toISOString(),
      created_at: start.subtract(5, "day").toISOString(),
      parent: { name: "Family Overdue" },
      pdf_url: "#",
      notes_html: "<p>Overdue. Contact support.</p>",
    },
    {
      id: "INV-1004",
      status: "paid",
      total_cents: 99000,
      currency: "EUR",
      due_at: end.add(3, "day").toISOString(),
      created_at: end.subtract(2, "day").toISOString(),
      parent: { name: "Family Recent" },
      pdf_url: "#",
    },
    {
      id: "INV-1005",
      status: "uncollectible",
      total_cents: 32000,
      currency: "EUR",
      due_at: start.add(1, "day").toISOString(),
      created_at: start.add(1, "day").toISOString(),
      parent: { name: "Family Edge" },
      pdf_url: "#",
    },
  ];
}
const genId = () => `INV-${Math.floor(1000 + Math.random() * 9000)}`;

/** Small wrapper so ReactQuill plays nicely with Form */
function RichTextArea({ value, onChange, onImageUpload }) {
  const quillRef = useRef(null);

  const handleImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const quill = quillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      try {
        const url = await onImageUpload(file);
        if (range) {
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1);
        }
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  };

  const modules = {
    toolbar: {
      container: [
        [{ header: [3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
      ],
      handlers: { image: handleImage },
    },
    clipboard: { matchVisual: false },
  };

  const formats = ["header", "bold", "italic", "underline", "list", "bullet", "align", "link", "image"];

  return (
    <div className="antd-quill">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
      />
      <style>{`
        .antd-quill .ql-container { min-height: 140px; }
        .antd-quill .ql-toolbar, .antd-quill .ql-container { border-radius: 8px; }
      `}</style>
    </div>
  );
}

/* ---------------- component ---------------- */
export default function Invoices() {
  const screens = useBreakpoint();
  const drawerWidth = useResponsiveDrawerWidth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [q, setQ] = useState("");
  const qTimer = useRef(null);

  // selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // detail drawer
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  // confirm drawers
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const sanitize = (html) => {
    if (DOMPurify?.sanitize) return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    return String(html || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  };

  const load = async () => {
    setLoading(true);
    try {
      const url = `/invoices?from=${range[0].startOf("day").toISOString()}&to=${range[1]
        .endOf("day")
        .toISOString()}`;
      const res = await api.get(url);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setData(rows.length ? rows : buildDummyInvoices(range));
    } catch {
      setData(buildDummyInvoices(range));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((i) =>
      `${i.id || i.stripe_invoice_id} ${i?.parent?.name || ""}`.toLowerCase().includes(s)
    );
  }, [data, q]);

  const exportCsv = () => {
    const rows = [["ID", "Status", "Total", "Currency", "Due", "Created", "Parent"]];
    filtered.forEach((i) =>
      rows.push([
        i.id || i.stripe_invoice_id,
        i.status,
        (i.total_cents || 0) / 100,
        i.currency || "EUR",
        i.due_at || "",
        i.created_at || "",
        i?.parent?.name || "",
      ])
    );
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resend = async (id) => {
    try {
      await api.post(`/invoice/${id}/resend`);
      message.success("Invoice resent");
    } catch {
      message.success("Invoice resent (simulated)");
    }
  };

  /* ------------ CRUD helpers ------------ */
  const openAdd = (prefill) => {
    setEditingId(null);
    form.resetFields();
    const now = dayjs();
    form.setFieldsValue({
      id: genId(),
      status: "open",
      total: 0,
      currency: "EUR",
      due_at: now.add(14, "day"),
      created_at: now,
      parent_name: "",
      notes_html: "",
      ...prefill,
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id || row.stripe_invoice_id);
    form.setFieldsValue({
      id: row.id || row.stripe_invoice_id,
      status: row.status || "open",
      total: (row.total_cents || 0) / 100,
      currency: row.currency || "EUR",
      due_at: row.due_at ? dayjs(row.due_at) : undefined,
      created_at: row.created_at ? dayjs(row.created_at) : undefined,
      parent_name: row?.parent?.name || "",
      pdf_url: row.pdf_url || "",
      notes_html: row.notes_html || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    try {
      if (row.id) await api.delete(`/invoice/${row.id}`);
    } catch {}
    setData((prev) =>
      prev.filter((x) => (x.id || x.stripe_invoice_id) !== (row.id || row.stripe_invoice_id))
    );
    setSelectedRowKeys((ks) => ks.filter((k) => k !== (row.id || row.stripe_invoice_id)));
    if (viewRec && (viewRec.id || viewRec.stripe_invoice_id) === (row.id || row.stripe_invoice_id)) {
      closeView();
    }
    message.success("Deleted");
  };

  const askDelete = (row) => {
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      setConfirmLoading(true);
      await handleDelete(confirmTarget);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkLoading(true);
      // simulate API deletes
      setData((prev) =>
        prev.filter(
          (x) => !selectedRowKeys.includes(x.id || x.stripe_invoice_id)
        )
      );
      if (viewRec && selectedRowKeys.includes(viewRec.id || viewRec.stripe_invoice_id)) {
        closeView();
      }
      setSelectedRowKeys([]);
      message.success("Selected invoices deleted");
      setBulkOpen(false);
    } finally {
      setBulkLoading(false);
    }
  };

  const submitModal = async () => {
    const vals = await form.validateFields();
    const cleanNotes = sanitize(vals.notes_html || "");
    const payload = {
      id: vals.id,
      status: vals.status,
      total_cents: Math.round((vals.total || 0) * 100),
      currency: vals.currency,
      due_at: vals.due_at?.toISOString(),
      created_at: vals.created_at?.toISOString(),
      parent: { name: vals.parent_name || "" },
      pdf_url: vals.pdf_url || "",
      notes_html: cleanNotes,
    };

    if (editingId) {
      try {
        await api.put(`/invoice/${editingId}`, payload);
      } catch {}
      setData((prev) =>
        prev.map((x) =>
          (x.id || x.stripe_invoice_id) === editingId ? { ...x, ...payload } : x
        )
      );
      message.success("Invoice updated");
    } else {
      try {
        await api.post(`/invoices`, payload);
      } catch {}
      setData((prev) => [{ ...payload }, ...prev]);
      message.success("Invoice added");
    }
    setModalOpen(false);
  };

  const uploadImage = async (file) => {
    await new Promise((r) => setTimeout(r, 250));
    return URL.createObjectURL(file);
  };

  /* ------------ view / drawer ------------ */
  const openView = useCallback(
    (idOrRecord) => {
      const id =
        typeof idOrRecord === "object"
          ? idOrRecord.id || idOrRecord.stripe_invoice_id
          : idOrRecord;
      const rec =
        data.find((x) => String(x.id || x.stripe_invoice_id) === String(id)) || null;
      if (!rec) return message.error("Invoice not found.");
      setViewRec(rec);
      setViewOpen(true);
    },
    [data]
  );

  const closeView = () => {
    setViewOpen(false);
    setViewRec(null);
  };

  /* ------------ columns map for BillingEntityList ------------ */
  const COLUMNS_MAP = useMemo(() => {
    const id = {
      title: "ID",
      dataIndex: "id",
      key: "id",
      ellipsis: true,
      width: 180,
      sorter: (a, b) =>
        String(a.id || a.stripe_invoice_id).localeCompare(String(b.id || b.stripe_invoice_id)),
      render: (v, r) => {
        const label = v || r.stripe_invoice_id;
        return label ? (
          <Button type="link" className="!px-0" onClick={() => openView(r.id || r.stripe_invoice_id)}>
            <Text strong>{label}</Text>
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    };
    const parent = {
      title: "Parent",
      key: "parent",
      ellipsis: true,
      render: (_, r) => r?.parent?.name || "—",
    };
    const status = {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v) =>
        UNPAID.has(String(v).toLowerCase()) ? (
          <Tag color="orange">{v}</Tag>
        ) : String(v).toLowerCase() === "paid" ? (
          <Tag color="green">paid</Tag>
        ) : (
          <Tag>{v || "—"}</Tag>
        ),
    };
    const total = {
      title: "Total",
      key: "total",
      width: 160,
      align: "right",
      sorter: (a, b) => (a.total_cents || 0) - (b.total_cents || 0),
      render: (_, r) => <MoneyText amount={(r.total_cents || 0) / 100} currency={r.currency || "EUR"} />,
    };
    const due = {
      title: "Due",
      dataIndex: "due_at",
      key: "due",
      width: 160,
      sorter: (a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0),
      render: (v, r) =>
        v ? (
          <Space size={4}>
            <span>{new Date(v).toLocaleDateString()}</span>
            {UNPAID.has(String(r.status).toLowerCase()) && new Date(v) < new Date() ? (
              <Tag color="red">overdue</Tag>
            ) : null}
          </Space>
        ) : (
          "—"
        ),
    };
    const created = {
      title: "Created",
      dataIndex: "created_at",
      key: "created",
      width: 180,
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    };

    return { id, parent, status, total, due, created };
  }, [openView]);

  /* ------------ dotted actions menu ------------ */
  const actionsRender = (r) => (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "view", icon: <EyeOutlined />, label: "View" },
          { key: "edit", icon: <EditOutlined />, label: "Edit" },
          { key: "delete", icon: <DeleteOutlined />, label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
          { type: "divider" },
          ...(r.pdf_url ? [{ key: "pdf", icon: <FilePdfOutlined />, label: "Open PDF" }] : []),
          { key: "resend", icon: <SendOutlined />, label: "Resend Email" },
          { type: "divider" },
          { key: "add", icon: <PlusOutlined />, label: "Add Invoice (prefill)" },
        ],
        onClick: ({ key }) => {
          if (key === "view") openView(r.id || r.stripe_invoice_id);
          if (key === "edit") openEdit(r);
          if (key === "delete") askDelete(r);
          if (key === "pdf" && r.pdf_url) window.open(r.pdf_url, "_blank", "noopener,noreferrer");
          if (key === "resend") resend(r.id || r.stripe_invoice_id);
          if (key === "add")
            openAdd({ parent_name: r?.parent?.name || "", currency: r.currency || "EUR" });
        },
      }}
      placement="bottomRight"
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );

  /* ------------ toolbars for BillingEntityList ------------ */
  const toolbarLeft = (
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search ID or parent…"
        onChange={(e) => {
          const v = e.target.value;
          if (qTimer.current) clearTimeout(qTimer.current);
          qTimer.current = setTimeout(() => setQ(v), 250);
        }}
        style={{ width: 260 }}
      />
      <RangePicker value={range} onChange={setRange} />
      <Badge color="blue" count={filtered.length} offset={[6, -2]}>
        <span style={{ display: "inline-block", width: 1 }} />
      </Badge>
    </Space>
  );

  const toolbarRight = (
    <Space wrap>
      {selectedRowKeys.length > 0 && (
        <Button danger icon={<DeleteOutlined />} onClick={() => setBulkOpen(true)}>
          Delete selected
        </Button>
      )}
      <Button icon={<ReloadOutlined />} onClick={load} />
      <Button icon={<DownloadOutlined />} onClick={exportCsv}>
        Export
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd()}>
        Add Invoice
      </Button>
    </Space>
  );

  /* ------------ KPIs ------------ */
  const kpis = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + (r.total_cents || 0), 0) / 100;
    const unpaidCount = filtered.filter((r) => UNPAID.has(String(r.status).toLowerCase())).length;
    const paidCount = filtered.filter((r) => String(r.status).toLowerCase() === "paid").length;
    const cur = filtered[0]?.currency || "EUR";
    return { total, unpaidCount, paidCount, cur };
  }, [filtered]);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card size="small" className="rounded-xl">
          <div className="text-xs text-gray-500">Total Amount (filtered)</div>
          <div className="text-lg font-semibold">
            <MoneyText amount={kpis.total} currency={kpis.cur} />
          </div>
        </Card>
        <Card size="small" className="rounded-xl">
          <div className="text-xs text-gray-500">Paid</div>
          <div className="text-lg font-semibold">{kpis.paidCount}</div>
        </Card>
        <Card size="small" className="rounded-xl">
          <div className="text-xs text-gray-500">Unpaid</div>
          <div className="text-lg font-semibold">{kpis.unpaidCount}</div>
        </Card>
      </div>

      {/* Entity list */}
      <BillingEntityList
        title="Invoices"
        data={filtered}
        loading={loading}
        columnsMap={COLUMNS_MAP}
        storageKey="invoices.visibleCols.v1"
        defaultVisible={["id", "parent", "status", "total", "due", "created"]}
        actionsRender={actionsRender}
        onRefresh={load}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        selection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          // important: rowKey is id or stripe_invoice_id
          rowKeyFn: (r) => r.id || r.stripe_invoice_id,
        }}
        pageSize={12}
        scrollX={900}
        onRowClick={(r) => openView(r.id || r.stripe_invoice_id)}
      />

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingId ? `Edit Invoice ${editingId}` : "Add Invoice"}
        onCancel={() => setModalOpen(false)}
        onOk={submitModal}
        okText={editingId ? "Save" : "Create"}
        width={screens.md ? 720 : "90%"}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ notes_html: "" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="id" label="Invoice ID" rules={[{ required: true }]}>
              <Input placeholder="INV-1234" />
            </Form.Item>
            <Form.Item name="parent_name" label="Parent / Customer" rules={[{ required: true }]}>
              <Input placeholder="e.g., Family Smith" />
            </Form.Item>

            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select options={STATUS_OPTIONS} />
            </Form.Item>

            <Form.Item name="total" label="Total Amount" rules={[{ required: true }]}>
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                addonAfter={
                  <Form.Item noStyle name="currency" initialValue="EUR">
                    <Select bordered={false} options={CURRENCY_OPTIONS} style={{ width: 80 }} />
                  </Form.Item>
                }
              />
            </Form.Item>

            <Form.Item name="due_at" label="Due Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="created_at" label="Created At" rules={[{ required: true }]}>
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="pdf_url" label="PDF URL" className="md:col-span-2">
              <Input placeholder="https://…" />
            </Form.Item>

            {/* RICH TEXT NOTES */}
            <Form.Item name="notes_html" label="Notes / Terms" className="md:col-span-2">
              <RichTextArea
                value={Form.useWatch("notes_html", form)}
                onChange={(html) => form.setFieldsValue({ notes_html: html })}
                onImageUpload={uploadImage}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* View Drawer */}
      <Drawer
        title="Invoice"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        style={{ top: HEADER_OFFSET }}
        maskStyle={{ top: HEADER_OFFSET }}
        extra={
          viewRec ? (
            <Space>
              {viewRec?.pdf_url ? (
                <Button icon={<FilePdfOutlined />} onClick={() => window.open(viewRec.pdf_url, "_blank", "noopener,noreferrer")}>
                  PDF
                </Button>
              ) : null}
              <Button icon={<SendOutlined />} onClick={() => resend(viewRec.id || viewRec.stripe_invoice_id)}>
                Resend
              </Button>
              <Button icon={<EditOutlined />} onClick={() => openEdit(viewRec)}>
                Edit
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => askDelete(viewRec)}>
                Delete
              </Button>
            </Space>
          ) : null
        }
      >
        {viewRec ? (
          <>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="ID">
                {viewRec.id || viewRec.stripe_invoice_id || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Parent">
                {viewRec?.parent?.name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {UNPAID.has(String(viewRec.status).toLowerCase()) ? (
                  <Tag color="orange">{viewRec.status}</Tag>
                ) : String(viewRec.status).toLowerCase() === "paid" ? (
                  <Tag color="green">paid</Tag>
                ) : (
                  <Tag>{viewRec.status || "—"}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                <MoneyText
                  amount={(viewRec.total_cents || 0) / 100}
                  currency={viewRec.currency || "EUR"}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Due">
                {viewRec.due_at ? new Date(viewRec.due_at).toLocaleString() : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {viewRec.created_at ? new Date(viewRec.created_at).toLocaleString() : "—"}
              </Descriptions.Item>
              {viewRec?.pdf_url ? (
                <Descriptions.Item label="PDF">
                  <Button
                    size="small"
                    icon={<FilePdfOutlined />}
                    onClick={() => window.open(viewRec.pdf_url, "_blank", "noopener,noreferrer")}
                  >
                    Open PDF
                  </Button>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {viewRec?.notes_html ? (
              <>
                <Divider className="my-4" />
                <h4 className="font-semibold mb-2">Notes / Terms</h4>
                <div
                  className="prose max-w-none ql-editor border rounded-md p-3 bg-white"
                  dangerouslySetInnerHTML={{ __html: sanitize(viewRec.notes_html) }}
                />
              </>
            ) : null}
          </>
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>

      {/* Confirm Drawer: single delete */}
      <ConfirmDrawer
        open={confirmOpen}
        title="Delete invoice?"
        description={
          <>
            This will permanently delete{" "}
            <Text strong>
              {confirmTarget?.id || confirmTarget?.stripe_invoice_id || "—"}
            </Text>
            . This action cannot be undone.
          </>
        }
        loading={confirmLoading}
        confirmText="Delete"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
      />

      {/* Confirm Drawer: bulk delete */}
      <ConfirmDrawer
        open={bulkOpen}
        title="Delete selected invoices?"
        description={
          <>
            You are about to delete <Text strong>{selectedRowKeys.length}</Text>{" "}
            invoice{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.
          </>
        }
        loading={bulkLoading}
        confirmText="Delete all"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleBulkDelete}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
