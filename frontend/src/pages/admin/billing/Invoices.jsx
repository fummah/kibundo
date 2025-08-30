// src/pages/billing/Invoices.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Card, Table, Tag, Space, Button, Input, DatePicker, Tooltip, message,
  Dropdown, Modal, Form, InputNumber, Select, Empty, Divider, Descriptions, Grid, Badge
} from "antd";
import {
  ReloadOutlined, DownloadOutlined, SendOutlined, FilePdfOutlined, SearchOutlined, EllipsisOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Optional: npm i dompurify (recommended)
let DOMPurify;
try {
  // If available at runtime, use it; otherwise fall back to a simple strip
  DOMPurify = require("dompurify");
} catch {}

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const UNPAID = new Set(["open","past_due","uncollectible"]);
const STATUS_OPTIONS = [
  { value: "open", label: "open" },
  { value: "paid", label: "paid" },
  { value: "past_due", label: "past_due" },
  { value: "uncollectible", label: "uncollectible" }
];
const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "ZAR", label: "ZAR" }
];

const fmtMoney = (amount, currency="EUR") =>
  Number(amount ?? 0).toLocaleString(undefined, { style: "currency", currency });

/* ---------------- DUMMY HELPERS ---------------- */
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
      notes_html: "<p>Thank you for your payment.</p>"
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
      notes_html: "<p>Please settle within 14 days.</p>"
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
      notes_html: "<p>Overdue. Contact support.</p>"
    },
    {
      id: "INV-1004",
      status: "paid",
      total_cents: 99000,
      currency: "EUR",
      due_at: end.add(3, "day").toISOString(),
      created_at: end.subtract(2, "day").toISOString(),
      parent: { name: "Family Recent" },
      pdf_url: "#"
    },
    {
      id: "INV-1005",
      status: "uncollectible",
      total_cents: 32000,
      currency: "EUR",
      due_at: start.add(1, "day").toISOString(),
      created_at: start.add(1, "day").toISOString(),
      parent: { name: "Family Edge" },
      pdf_url: "#"
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

  const formats = ["header","bold","italic","underline","list","bullet","align","link","image"];

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

export default function Invoices() {
  const screens = useBreakpoint();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [q, setQ] = useState("");
  const qTimer = useRef(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // preview
  const [previewRow, setPreviewRow] = useState(null);

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
    return data.filter(i =>
      `${i.id||i.stripe_invoice_id} ${i?.parent?.name||""}`.toLowerCase().includes(s)
    );
  }, [data, q]);

  const exportCsv = () => {
    const rows = [["ID","Status","Total","Currency","Due","Created","Parent"]];
    filtered.forEach(i => rows.push([
      i.id || i.stripe_invoice_id,
      i.status,
      (i.total_cents||0)/100,
      i.currency || "EUR",
      i.due_at || "",
      i.created_at || "",
      i?.parent?.name || ""
    ]));
    const csv = rows.map(r => r.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "invoices.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const resend = async (id) => {
    try {
      await api.post(`/invoice/${id}/resend`);
      message.success("Invoice resent");
    } catch {
      message.success("Invoice resent (simulated)");
    }
  };

  // ------- Add / Edit / Delete -------
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
      ...prefill
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

  const handleDelete = (row) => {
    Modal.confirm({
      title: `Delete invoice ${row.id || row.stripe_invoice_id}?`,
      okType: "danger",
      onOk: async () => {
        try {
          if (row.id) await api.delete(`/invoice/${row.id}`);
        } catch {}
        setData((prev) => prev.filter(x => (x.id || x.stripe_invoice_id) !== (row.id || row.stripe_invoice_id)));
        message.success("Deleted");
      }
    });
  };

  const sanitize = (html) => {
    if (DOMPurify?.sanitize) return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    // minimal fallback: strip script tags
    return String(html || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
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
      try { await api.put(`/invoice/${editingId}`, payload); } catch {}
      setData(prev => prev.map(x =>
        (x.id || x.stripe_invoice_id) === editingId ? { ...x, ...payload } : x
      ));
      message.success("Invoice updated");
    } else {
      try { await api.post(`/invoices`, payload); } catch {}
      setData(prev => [{ ...payload }, ...prev]);
      message.success("Invoice added");
    }
    setModalOpen(false);
  };

  const uploadImage = async (file) => {
    // Replace with your real upload endpoint
    await new Promise(r => setTimeout(r, 250));
    return URL.createObjectURL(file);
  };

  // memoized columns for perf + responsiveness
  const columns = useMemo(() => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      ellipsis: true,
      width: 180,
      render: (v, r) => v || r.stripe_invoice_id
    },
    {
      title: "Parent",
      key: "parent",
      ellipsis: true,
      render: (_, r) => r?.parent?.name || "—"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      filters: [
        { text: "Paid", value: "paid" },
        { text: "Open", value: "open" },
        { text: "Past due", value: "past_due" },
        { text: "Uncollectible", value: "uncollectible" },
      ],
      onFilter: (val, rec) => (rec.status || "").toLowerCase() === val,
      render: (v) =>
        UNPAID.has(String(v).toLowerCase()) ? (
          <Tag color="orange">{v}</Tag>
        ) : String(v).toLowerCase() === "paid" ? (
          <Tag color="green">paid</Tag>
        ) : (
          <Tag>{v || "—"}</Tag>
        ),
    },
    {
      title: "Total",
      key: "total",
      width: 160,
      align: "right",
      sorter: (a, b) => (a.total_cents||0) - (b.total_cents||0),
      render: (_, r) => fmtMoney((r.total_cents||0)/100, r.currency||"EUR")
    },
    {
      title: "Due",
      dataIndex: "due_at",
      key: "due_at",
      width: 150,
      sorter: (a, b) => new Date(a.due_at||0) - new Date(b.due_at||0),
      render: (v, r) => v ? (
        <Space size={4}>
          <span>{new Date(v).toLocaleDateString()}</span>
          {UNPAID.has(String(r.status).toLowerCase()) && new Date(v) < new Date() ? <Tag color="red">overdue</Tag> : null}
        </Space>
      ) : "—"
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => new Date(a.created_at||0) - new Date(b.created_at||0),
      defaultSortOrder: "descend",
      render: v => v ? new Date(v).toLocaleString() : "—"
    },
    {
      title: "Actions",
      key: "actions",
      fixed: screens.md ? "right" : undefined,
      width: 90,
      render: (_, r) => {
        const items = [
          { key: "preview", icon: <EyeOutlined />, label: "Preview" },
          { key: "edit", icon: <EditOutlined />, label: "Edit" },
          { key: "delete", icon: <DeleteOutlined />, label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
          { type: "divider" },
          ...(r.pdf_url ? [{ key: "pdf", icon: <FilePdfOutlined />, label: "Open PDF" }] : []),
          { key: "resend", icon: <SendOutlined />, label: "Resend Email" },
          { type: "divider" },
          { key: "add", icon: <PlusOutlined />, label: "Add Invoice (prefill)" },
        ];

        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items,
              onClick: ({ key }) => {
                if (key === "pdf" && r.pdf_url) window.open(r.pdf_url, "_blank", "noopener,noreferrer");
                if (key === "resend") resend(r.id || r.stripe_invoice_id);
                if (key === "edit") openEdit(r);
                if (key === "delete") handleDelete(r);
                if (key === "add") openAdd({ parent_name: r?.parent?.name || "", currency: r.currency || "EUR" });
                if (key === "preview") setPreviewRow(r);
              }
            }}
          >
            <Tooltip title="Actions">
              <Button type="text" icon={<EllipsisOutlined />} />
            </Tooltip>
          </Dropdown>
        );
      }
    },
  ], [screens.md]); // eslint-disable-line react-hooks/exhaustive-deps

  // quick KPIs
  const kpis = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + (r.total_cents || 0), 0) / 100;
    const unpaidCount = filtered.filter(r => UNPAID.has(String(r.status).toLowerCase())).length;
    const paidCount = filtered.filter(r => String(r.status).toLowerCase() === "paid").length;
    const cur = filtered[0]?.currency || "EUR";
    return { total, unpaidCount, paidCount, cur };
  }, [filtered]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold m-0">Invoices</h2>
            <Badge color="blue" count={filtered.length} offset={[6, -2]}>
              <span />
            </Badge>
          </div>
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
              style={{ width: screens.xs ? 220 : 260 }}
            />
            <RangePicker value={range} onChange={setRange} />
            <Button icon={<ReloadOutlined />} onClick={load} />
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd()}>
              Add Invoice
            </Button>
          </Space>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card size="small" className="rounded-xl">
            <div className="text-xs text-gray-500">Total Amount (filtered)</div>
            <div className="text-lg font-semibold">{fmtMoney(kpis.total, kpis.cur)}</div>
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

        <Card bodyStyle={{ padding: 0 }} className="rounded-2xl overflow-hidden">
          <Table
            size="middle"
            rowKey={(r)=>r.id || r.stripe_invoice_id}
            columns={columns}
            dataSource={filtered}
            loading={loading}
            pagination={{ pageSize: 12, showSizeChanger: true }}
            scroll={{ x: 900 }}
            sticky
            locale={{
              emptyText: (
                <Empty description={
                  <div className="space-y-2">
                    <div>No invoices found</div>
                    <div className="text-xs text-gray-500">Try adjusting filters or add a new invoice</div>
                  </div>
                }>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd()}>Add Invoice</Button>
                </Empty>
              )
            }}
          />
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingId ? `Edit Invoice ${editingId}` : "Add Invoice"}
        onCancel={() => setModalOpen(false)}
        onOk={submitModal}
        okText={editingId ? "Save" : "Create"}
        width={screens.md ? 720 : "90%"}
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
                min={0} step={0.01} style={{ width: "100%" }}
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

      {/* Preview Modal */}
      <Modal
        open={!!previewRow}
        onCancel={() => setPreviewRow(null)}
        footer={null}
        title={`Invoice ${previewRow?.id || previewRow?.stripe_invoice_id || ""}`}
        width={screens.lg ? 760 : "90%"}
      >
        {previewRow && (
          <>
            <Descriptions column={1} size="middle" bordered className="mb-3">
              <Descriptions.Item label="Parent">{previewRow?.parent?.name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Status">
                {UNPAID.has(String(previewRow.status).toLowerCase()) ? (
                  <Tag color="orange">{previewRow.status}</Tag>
                ) : String(previewRow.status).toLowerCase() === "paid" ? (
                  <Tag color="green">paid</Tag>
                ) : (<Tag>{previewRow.status || "—"}</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {fmtMoney((previewRow.total_cents||0)/100, previewRow.currency || "EUR")}
              </Descriptions.Item>
              <Descriptions.Item label="Due">
                {previewRow.due_at ? new Date(previewRow.due_at).toLocaleString() : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {previewRow.created_at ? new Date(previewRow.created_at).toLocaleString() : "—"}
              </Descriptions.Item>
              {previewRow?.pdf_url ? (
                <Descriptions.Item label="PDF">
                  <Button size="small" icon={<FilePdfOutlined />} onClick={() => window.open(previewRow.pdf_url, "_blank", "noopener,noreferrer")}>
                    Open PDF
                  </Button>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {previewRow?.notes_html ? (
              <>
                <Divider className="my-3" />
                <h4 className="font-semibold mb-2">Notes / Terms</h4>
                <div
                  className="prose max-w-none ql-editor border rounded-md p-3 bg-white"
                  dangerouslySetInnerHTML={{ __html: sanitize(previewRow.notes_html) }}
                />
              </>
            ) : null}

            <Divider className="my-3" />
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => { setPreviewRow(null); openEdit(previewRow); }}>
                Edit
              </Button>
              <Button icon={<SendOutlined />} onClick={() => resend(previewRow.id || previewRow.stripe_invoice_id)}>
                Resend Email
              </Button>
              <Button
                danger icon={<DeleteOutlined />}
                onClick={() => { setPreviewRow(null); handleDelete(previewRow); }}
              >
                Delete
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </>
  );
}
