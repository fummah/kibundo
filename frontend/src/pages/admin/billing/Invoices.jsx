import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Card, Tag, Space, Button, Input, DatePicker, message, Dropdown, Modal, Form,
  InputNumber, Select, Descriptions, Grid, Drawer, Typography, Spin, Result
} from "antd";
import {
  ReloadOutlined, DownloadOutlined, SendOutlined, FilePdfOutlined, SearchOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined,
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

const HEADER_OFFSET = 64;
const genId = () => `INV-${Date.now()}`;

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

const normalizeInvoiceData = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((invoice, index) => {
    const record = Array.isArray(invoice)
      ? {
          id: invoice[0],
          parent_id: invoice[1],
          stripe_invoice_id: invoice[2],
          status: invoice[3],
          total_cents: invoice[4] || 0,
          line_items: invoice[5] || null,
          due_at: invoice[6] || null,
          created_at: invoice[7] || null,
          currency: invoice[8] || "EUR",
          parent_name: invoice[9] || null,
        }
      : invoice;

    let lineItems = record.line_items;
    if (typeof lineItems === "string") {
      try { lineItems = JSON.parse(lineItems); } catch { lineItems = null; }
    }

    const extractedParentName = (() => {
      if (record?.invoiceuser?.user?.first_name || record?.invoiceuser?.user?.last_name) {
        return [record.invoiceuser.user.first_name, record.invoiceuser.user.last_name].filter(Boolean).join(" ").trim();
      }
      if (record?.parent?.first_name || record?.parent?.last_name) {
        return [record.parent.first_name, record.parent.last_name].filter(Boolean).join(" ").trim();
      }
      if (record?.parent?.name) return record.parent.name;
      if (record?.parent_name) return record.parent_name;
      if (record?.parent_id) return `Parent ${record.parent_id}`;
      if (record?.invoiceuser && typeof record.invoiceuser === "object") {
        if (record.invoiceuser.first_name || record.invoiceuser.last_name) {
          return [record.invoiceuser.first_name, record.invoiceuser.last_name].filter(Boolean).join(" ").trim();
        }
        if (record.invoiceuser.name) return record.invoiceuser.name;
      }
      return "";
    })();

    return {
      ...record,
      parent_name: extractedParentName,
      total_cents: Number(record.total_cents) || 0,
      due_at: record.due_at ? new Date(record.due_at) : null,
      created_at: record.created_at ? new Date(record.created_at) : new Date(),
      status: String(record.status || "").toLowerCase(),
      currency: record.currency || "EUR",
      id: record.id || `temp_${index}_${Date.now()}`,
      line_items: lineItems,
    };
  });
};

export default function Invoices() {
  const screens = useBreakpoint();
  const drawerWidth = useResponsiveDrawerWidth();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams] = useSearchParams();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [q, setQ] = useState("");
  const [range, setRange] = useState(null);
  const qTimer = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const notesHtml = Form.useWatch("notes_html", form);
  const [formLoading, setFormLoading] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const sanitize = (html) =>
    String(html || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  const {
    data: pageData,
    isLoading: loading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["invoicesPageData"],
    queryFn: async () => {
      const [invRes, pRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/parents"),
      ]);

      let rows = [];
      if (Array.isArray(invRes?.data)) rows = invRes.data;
      else if (Array.isArray(invRes?.data?.data)) rows = invRes.data.data;
      else if (Array.isArray(invRes?.data?.invoices)) rows = invRes.data.invoices;
      else if (Array.isArray(invRes?.data?.rows)) rows = invRes.data.rows;
      const normalizedInvoices = normalizeInvoiceData(rows);

      const parentsArr = Array.isArray(pRes?.data) ? pRes.data
        : Array.isArray(pRes?.data?.data) ? pRes.data.data
        : [];

      return { invoices: normalizedInvoices, parents: parentsArr };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const data = pageData?.invoices || [];
  const parents = pageData?.parents || [];

  const fetchOne = useCallback(
    async (id) => {
      try {
        const res = await api.get(`/invoice/${encodeURIComponent(id)}`);
        const r = res?.data || null;
        if (!r) return null;
        return normalizeInvoiceData([r])[0];
      } catch (err) {
        console.error("Failed to fetch invoice:", err);
        messageApi.error("Could not load the invoice details.");
        return null;
      }
    },
    [messageApi]
  );

  const createOrUpdate = useCallback(async (payload) => {
    const res = await api.post("/addinvoice", payload);
    return res?.data;
  }, []);

  const removeOne = useCallback(async (id) => {
    return api.delete(`/invoice/${encodeURIComponent(id)}`);
  }, []);

  const resend = useCallback(async (id) => {
    if (!id) return;
    try {
      await api.post(`/invoice/${encodeURIComponent(id)}/resend`);
      messageApi.success("Invoice email resent.");
    } catch (e) {
      console.error(e);
      messageApi.error("Failed to resend invoice email.");
    }
  }, [messageApi]);

  const openAdd = useCallback((prefill) => {
    setEditingId(null);
    form.resetFields();
    const now = dayjs();
    form.setFieldsValue({
      id: genId(),
      status: "open",
      total: 0,
      currency: "EUR",
      created_at: now,
      parent_id: undefined,
      stripe_invoice_id: `in_${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      notes_html: "",
      pdf_url: "",
      ...prefill,
    });
    setModalOpen(true);
  }, [form]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      openAdd();
    }
  }, [searchParams, openAdd]);

  const parentOptions = useMemo(() => {
    return (parents || []).map((p, idx) => {
      const first = p?.user?.first_name || "";
      const last  = p?.user?.last_name || "";
      const label = [first, last].filter(Boolean).join(" ").trim() || p?.user?.name || `Parent ${p?.id ?? idx}`;
      return { value: p?.id, label };
    });
  }, [parents]);

  const filtered = useMemo(() => {
    let result = data || [];
    if (q) {
      const searchLower = q.toLowerCase();
      result = result.filter((item) => {
        const idStr = String(item.id || item.stripe_invoice_id || "").toLowerCase();
        const parentName = String(item?.parent_name || "").toLowerCase();
        const status = String(item?.status || "").toLowerCase();
        return (
          idStr.includes(searchLower) ||
          parentName.includes(searchLower) ||
          status.includes(searchLower)
        );
      });
    }

    if (range && range.length === 2) {
      const [startDate, endDate] = range;
      if (startDate && endDate) {
        result = result.filter((item) => {
          const itemDate = new Date(item.created_at || item.due_at);
          return itemDate >= startDate.toDate() && itemDate <= endDate.toDate();
        });
      }
    }
    return result;
  }, [data, q, range]);

  const openEdit = (row) => {
    setEditingId(row.id || row.stripe_invoice_id);
    let parentId = row.parent_id;
    if (!parentId && row?.parent_name) {
      const match = parentOptions.find(o => o.label === row.parent_name);
      parentId = match?.value;
    }
    form.setFieldsValue({
      id: row.id || row.stripe_invoice_id,
      status: row.status || "open",
      total: (row.total_cents || 0) / 100,
      currency: row.currency || "EUR",
      created_at: row.created_at ? dayjs(row.created_at) : undefined,
      parent_id: parentId,
      stripe_invoice_id: row.stripe_invoice_id || "",
      pdf_url: row.pdf_url || "",
      notes_html: row.notes_html || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    const id = row.id || row.stripe_invoice_id;
    if (!id) return;
    try {
      await removeOne(id);
      refetch(); // Refetch data after delete
      setSelectedRowKeys((ks) => ks.filter((k) => k !== id));
      if (viewRec && (viewRec.id || viewRec.stripe_invoice_id) === id) {
        closeView();
      }
      messageApi.success("Deleted");
    } catch (e) {
      console.error(e);
      messageApi.error("Failed to delete.");
    }
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
      await Promise.all(selectedRowKeys.map(id => removeOne(id)));
      refetch(); // Refetch data after bulk delete
      if (viewRec && selectedRowKeys.includes(viewRec.id || viewRec.stripe_invoice_id)) {
        closeView();
      }
      setSelectedRowKeys([]);
      messageApi.success("Selected invoices deleted");
      setBulkOpen(false);
    } catch(e) {
      console.error("Failed to bulk delete", e);
      messageApi.error("Failed to delete some invoices.");
    } finally {
      setBulkLoading(false);
    }
  };

  const submitModal = async () => {
    try {
      setFormLoading(true);
      const vals = await form.validateFields();
      const cleanNotes = sanitize(vals.notes_html || "");
      const parentRec = parents.find((p) => p?.id === vals.parent_id);
      const parentName = parentRec ? [parentRec?.user?.first_name, parentRec?.user?.last_name].filter(Boolean).join(" ").trim() : "";

      const payload = {
        id: vals.id,
        status: vals.status || "open",
        total_cents: Math.round((Number(vals.total) || 0) * 100),
        currency: vals.currency || "EUR",
        created_at: vals.created_at ? dayjs(vals.created_at).toISOString() : new Date().toISOString(),
        parent_id: vals.parent_id || null,
        pdf_url: vals.pdf_url?.trim() || "",
        notes_html: cleanNotes,
        parent_name: parentName,
      };

      await createOrUpdate(payload);
      refetch(); // Refetch data after create/update
      messageApi.success(editingId ? "Invoice updated successfully" : "Invoice created successfully");
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
    } catch (err) {
      console.error("Save error:", err);
      messageApi.error("Please check required fields or your network and try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const uploadImage = async (file) => {
    await new Promise((r) => setTimeout(r, 250));
    return URL.createObjectURL(file);
  };

  const openView = useCallback(
    async (idOrRecord) => {
      const id = typeof idOrRecord === "object" ? idOrRecord.id || idOrRecord.stripe_invoice_id : idOrRecord;
      if (!id) return messageApi.error("Missing invoice id.");
      const fresh = await fetchOne(id);
      if (fresh) {
        setViewRec(fresh);
        setViewOpen(true);
        return;
      }
      const rec = data.find((x) => String(x.id || x.stripe_invoice_id) === String(id)) || null;
      if (!rec) return messageApi.error("Invoice not found.");
      setViewRec(rec);
      setViewOpen(true);
    },
    [data, fetchOne, messageApi]
  );

  const closeView = () => {
    setViewOpen(false);
    setViewRec(null);
  };

  const COLUMNS_MAP = useMemo(() => ({
    id: {
      title: "Invoice ID",
      dataIndex: "id",
      key: "id",
      width: 150,
      render: (v, r) => (
        <Button type="link" className="!px-0 !text-blue-600 hover:!text-blue-800 font-medium" onClick={() => openView(r.id || r.stripe_invoice_id)}>
          {v || "—"}
        </Button>
      ),
    },
    parent: {
      title: "Customer",
      key: "parent",
      width: 200,
      render: (_, r) => (
        <div className="font-medium text-slate-700">
          {r?.parent_name && r.parent_name !== "No customer" ? r.parent_name : <span className="text-slate-400 italic">No customer</span>}
        </div>
      ),
    },
    status: {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => {
        const statusValue = String(v || "").toLowerCase();
        if (statusValue === "paid") {
          return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>Paid</span>;
        } else if (UNPAID.has(statusValue)) {
          return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></div>{v || "Open"}</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{v || "—"}</span>;
      },
    },
    total: {
      title: "Amount",
      key: "total",
      width: 140,
      align: "right",
      sorter: (a, b) => (a.total_cents || 0) - (b.total_cents || 0),
      render: (_, r) => <div className="font-semibold text-slate-900"><MoneyText amount={(r.total_cents || 0) / 100} currency={r.currency || "EUR"} /></div>,
    },
    created: {
      title: "Created",
      dataIndex: "created_at",
      key: "created",
      width: 140,
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      render: (v) => v ? <div className="text-sm text-slate-600">{new Date(v).toLocaleDateString()}</div> : <span className="text-slate-400">—</span>,
    },
  }), [openView]);

  const actionsRender = (r) => {
    const items = [
      { key: "view", icon: <EyeOutlined />, label: "View" },
      { key: "edit", icon: <EditOutlined />, label: "Edit" },
      { key: "delete", icon: <DeleteOutlined />, label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
      { type: "divider" },
      { key: "resend", icon: <SendOutlined />, label: "Resend Email" },
      { type: "divider" },
      { key: "add", icon: <PlusOutlined />, label: "Add Invoice (prefill)" },
    ];
    if (r?.pdf_url) {
      items.splice(3, 0, { key: "pdf", icon: <FilePdfOutlined />, label: "View PDF" });
    }
    return (
      <Dropdown
        trigger={["click"]}
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === "view") openView(r.id || r.stripe_invoice_id);
            if (key === "edit") openEdit(r);
            if (key === "delete") askDelete(r);
            if (key === "pdf" && r.pdf_url) window.open(r.pdf_url, "_blank", "noopener,noreferrer");
            if (key === "resend") resend(r.id || r.stripe_invoice_id);
            if (key === "add") openAdd({ parent_name: r?.parent_name || "", currency: r.currency || "EUR" });
          },
        }}
        placement="bottomRight"
      >
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    );
  };

  const kpis = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + (r.total_cents || 0), 0) / 100;
    const unpaidCount = filtered.filter((r) => UNPAID.has(String(r.status).toLowerCase())).length;
    const paidCount = filtered.filter((r) => String(r.status).toLowerCase() === "paid").length;
    const cur = filtered[0]?.currency || "EUR";
    return { total, unpaidCount, paidCount, cur };
  }, [filtered]);

  const exportCsv = () => {
    const rows = [["ID", "Parent", "Status", "Total", "Currency", "Due", "Created", "Stripe ID", "Line Items"]];
    filtered.forEach((i) => {
      try {
        rows.push([
          i.id || i.stripe_invoice_id || "—",
          i?.parent_name || "—",
          i.status || "—",
          (i.total_cents || 0) / 100,
          i.currency || "EUR",
          i.due_at ? new Date(i.due_at).toLocaleDateString() : "—",
          i.created_at ? new Date(i.created_at).toLocaleDateString() : "—",
          i.stripe_invoice_id || "—",
          i.line_items ? JSON.stringify(i.line_items) : "—",
        ]);
      } catch (error) {
        console.error("Error exporting invoice:", i, error);
      }
    });
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError) {
    return (
      <Result
        status="error"
        title="Failed to Load Invoices"
        subTitle={error.message}
        extra={<Button type="primary" onClick={refetch}>Try Again</Button>}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto">
        {contextHolder}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Invoice Management</h1>
              <p className="text-slate-600 text-sm">Manage and track all your invoices in one place</p>
            </div>
            <div className="flex items-center gap-3">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} className="border-slate-300 hover:border-slate-400">Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd()} className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm" size="large">New Invoice</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI Cards */}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input allowClear placeholder="Search invoices..." onChange={(e) => { const v = e.target.value; if (qTimer.current) clearTimeout(qTimer.current); qTimer.current = setTimeout(() => setQ(v), 250); }} className="pl-10 border-slate-300 hover:border-slate-400 focus:border-blue-500" size="large" />
              </div>
              <RangePicker value={range} onChange={setRange} className="border-slate-300 hover:border-slate-400" size="large" />
            </div>
            <div className="flex items-center gap-3">
              {selectedRowKeys.length > 0 && (
                              <Button danger icon={<DeleteOutlined />} onClick={() => setBulkOpen(true)} className="border-red-300 hover:border-red-400" size="large">
                              Delete ({selectedRowKeys.length})
                            </Button>
                          )}
                          <Button icon={<DownloadOutlined />} onClick={exportCsv} className="border-slate-300 hover:border-slate-400" size="large">
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
            
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
                      <BillingEntityList
                        title=""
                        data={filtered}
                        loading={loading}
                        columnsMap={COLUMNS_MAP}
                        storageKey="invoices.visibleCols.v1"
                        defaultVisible={["id", "parent", "status", "total", "created"]}
                        actionsRender={actionsRender}
                        onRefresh={() => refetch()}
                        toolbarLeft={null}
                        toolbarRight={null}
                        selection={{
                          selectedRowKeys,
                          onChange: (keys) => setSelectedRowKeys(keys),
                          rowKeyFn: (r) => r.id || r.stripe_invoice_id,
                        }}
                        pageSize={12}
                        scrollX={1100}
                        onRowClick={(r) => openView(r.id || r.stripe_invoice_id)}
                      />
                    </div>
            
                    <Modal
                      open={modalOpen}
                      title={
                        <div className="flex items-center gap-3 pb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingId ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <div className={`w-4 h-4 rounded ${editingId ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 m-0">
                              {editingId ? `Edit Invoice ${editingId}` : "Create New Invoice"}
                            </h3>
                            <p className="text-sm text-slate-500 m-0">
                              {editingId ? "Update invoice details" : "Add a new invoice to your system"}
                            </p>
                          </div>
                        </div>
                      }
                      onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }}
                      onOk={submitModal}
                      okText={editingId ? "Update Invoice" : "Create Invoice"}
                      width={screens.md ? 800 : "95%"}
                      className="modern-modal"
                      destroyOnClose
                      confirmLoading={formLoading}
                      footer={[
                        <Button key="cancel" onClick={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }} className="border-slate-300 hover:border-slate-400">Cancel</Button>,
                        <Button key="submit" type="primary" onClick={submitModal} loading={formLoading} className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700">{editingId ? "Update Invoice" : "Create Invoice"}</Button>
                      ]}
                    >
                      <Spin spinning={formLoading} tip="Saving…">
                        <Form form={form} layout="vertical" initialValues={{ notes_html: "", status: "open", currency: "EUR", total: 0, created_at: dayjs(), due_at: dayjs().add(14, "day"), }} onFinish={submitModal} className="mt-4" disabled={formLoading}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h4>
                                <div className="space-y-4">
                                  <Form.Item name="id" label="Invoice ID" rules={[{ required: !editingId, message: "Please input the invoice ID!" }]}>
                                    <Input placeholder="INV-1234" disabled={!!editingId} className="border-slate-300 hover:border-slate-400 focus:border-blue-500" />
                                  </Form.Item>
                                  <Form.Item name="parent_id" label="Customer" rules={[{ required: true, message: "Please select a customer!" }]}>
                                    <Select placeholder="Select a customer..." loading={loading} showSearch options={parentOptions} filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} className="border-slate-300 hover:border-slate-400 focus:border-blue-500" />
                                  </Form.Item>
                                  <Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status!" }]}>
                                    <Select options={STATUS_OPTIONS} className="border-slate-300 hover:border-slate-400" />
                                  </Form.Item>
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Financial Details</h4>
                                <div className="space-y-4">
                                  <Form.Item name="total" label="Total Amount" rules={[{ required: true, message: "Please input the total amount!" }]}>
                                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} className="border-slate-300 hover:border-slate-400 focus:border-blue-500" />
                                  </Form.Item>
                                  <Form.Item name="currency" label="Currency" rules={[{ required: true, message: "Please select a currency!" }]}>
                                    <Select options={CURRENCY_OPTIONS} className="border-slate-300 hover:border-slate-400" />
                                  </Form.Item>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Date Information</h4>
                                <div className="space-y-4">
                                  <Form.Item name="created_at" label="Created At" rules={[{ required: true, message: "Please select creation date!" }]}>
                                    <DatePicker showTime style={{ width: "100%" }} format="YYYY-MM-DD HH:mm" className="border-slate-300 hover:border-slate-400 focus:border-blue-500" />
                                  </Form.Item>
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Additional Information</h4>
                                <div className="space-y-4">
                                  <Form.Item name="notes_html" label="Notes / Terms">
                                    <RichTextArea value={notesHtml} onChange={(html) => form.setFieldsValue({ notes_html: html })} onImageUpload={uploadImage} />
                                  </Form.Item>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Form>
                      </Spin>
                    </Modal>
            
                    <Drawer title="Invoice" open={viewOpen} onClose={closeView} width={drawerWidth} style={{ top: HEADER_OFFSET }} maskStyle={{ top: HEADER_OFFSET }} extra={viewRec ? (<Space><Button icon={<SendOutlined />} onClick={() => resend(viewRec.id || viewRec.stripe_invoice_id)}>Resend</Button>{viewRec?.pdf_url && (<Button icon={<FilePdfOutlined />} onClick={() => window.open(viewRec.pdf_url, "_blank", "noopener,noreferrer")}>PDF</Button>)}<Button icon={<EditOutlined />} onClick={() => openEdit(viewRec)}>Edit</Button><Button danger icon={<DeleteOutlined />} onClick={() => askDelete(viewRec)}>Delete</Button></Space>) : null}>
                      {viewRec ? (
                        <Descriptions bordered column={1} size="middle">
                          <Descriptions.Item label="Invoice ID">{viewRec.id || "—"}</Descriptions.Item>
                          <Descriptions.Item label="Customer">{viewRec?.parent_name || "No customer"}</Descriptions.Item>
                          <Descriptions.Item label="Status">{UNPAID.has(String(viewRec.status).toLowerCase()) ? <Tag color="orange">{viewRec.status}</Tag> : String(viewRec.status).toLowerCase() === "paid" ? <Tag color="green">paid</Tag> : <Tag>{viewRec.status || "—"}</Tag>}</Descriptions.Item>
                          <Descriptions.Item label="Total"><MoneyText amount={(viewRec.total_cents || 0) / 100} currency={viewRec.currency || "EUR"} /></Descriptions.Item>
                          <Descriptions.Item label="Created">{viewRec.created_at ? new Date(viewRec.created_at).toLocaleString() : "—"}</Descriptions.Item>
                        </Descriptions>
                      ) : <Text type="secondary">No data.</Text>}
                    </Drawer>
            
                    <ConfirmDrawer open={confirmOpen} title="Delete invoice?" description={<>This will permanently delete <Text strong>{confirmTarget?.id || confirmTarget?.stripe_invoice_id || "—"}</Text>. This action cannot be undone.</>} loading={confirmLoading} confirmText="Delete" showCloseButton cancelText="" topOffset={HEADER_OFFSET} onConfirm={handleConfirmDelete} onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }} />
                    <ConfirmDrawer open={bulkOpen} title="Delete selected invoices?" description={<>You are about to delete <Text strong>{selectedRowKeys.length}</Text> invoice{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.</>} loading={bulkLoading} confirmText="Delete all" showCloseButton cancelText="" topOffset={HEADER_OFFSET} onConfirm={handleBulkDelete} onClose={() => setBulkOpen(false)} />
                  </div>
                </div>
              );
            }