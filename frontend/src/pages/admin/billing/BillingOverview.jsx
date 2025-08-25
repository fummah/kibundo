// src/pages/billing/BillingHome.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Card, Row, Col, Typography, Statistic, Space, Button, List, Tag, Tooltip,
  message, Skeleton, Empty, DatePicker, Select, Input, Table, Segmented, Badge
} from "antd";
import {
  TeamOutlined, UsergroupAddOutlined, FileAddOutlined, SendOutlined,
  DollarCircleOutlined, CreditCardOutlined, FileDoneOutlined, FileSyncOutlined,
  PieChartOutlined, SettingOutlined, ReloadOutlined, DownloadOutlined, SearchOutlined
} from "@ant-design/icons";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RTooltip
} from "recharts";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ---------- helpers ---------- */
const money = (n, currency = "EUR") =>
  Number(n || 0).toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const read = (obj, path) => {
  if (!obj) return undefined;
  if (Array.isArray(path)) return path.reduce((a, k) => (a == null ? a : a[k]), obj);
  if (typeof path === "string" && path.includes("."))
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  return obj[path];
};

const UNPAID = new Set(["open", "past_due", "uncollectible"]);
const DONUT_COLORS = ["#1677ff", "#faad14", "#52c41a", "#eb2f96"];
const STATUS_COLORS = {
  paid: "green",
  open: "orange",
  past_due: "red",
  uncollectible: "volcano",
  void: "default",
  draft: "default",
};

/* ---------- DUMMY FALLBACKS ---------- */
const DUMMY_STUDENTS = [
  { id: 1, name: "A. Moyo" },
  { id: 2, name: "B. Dlamini" },
  { id: 3, name: "T. Ncube" },
  { id: 4, name: "J. Müller" },
  { id: 5, name: "S. Schmidt" }
];

const DUMMY_PARENTS = [
  { id: 11, name: "Mr. Moyo" },
  { id: 12, name: "Mrs. Dlamini" },
  { id: 13, name: "Ms. Ncube" }
];

// Cents-based totals; created_at/due_at can be ISO strings or Date
const now = dayjs();
const DUMMY_INVOICES = [
  {
    id: "INV-1001", status: "paid", total_cents: 125000, currency: "EUR",
    created_at: now.subtract(20, "day").toISOString(),
    due_at: now.subtract(10, "day").toISOString(),
    customer: "family.one@example.com", is_credit_note: false
  },
  {
    id: "INV-1002", status: "open", total_cents: 78000, currency: "EUR",
    created_at: now.subtract(8, "day").toISOString(),
    due_at: now.add(6, "day").toISOString(),
    customer: "family.two@example.com", is_credit_note: false
  },
  {
    id: "INV-1003", status: "past_due", total_cents: 54000, currency: "EUR",
    created_at: now.subtract(40, "day").toISOString(),
    due_at: now.subtract(7, "day").toISOString(),
    customer: "family.overdue@example.com", is_credit_note: false
  },
  {
    id: "INV-1004", status: "paid", total_cents: 99000, currency: "EUR",
    created_at: now.subtract(3, "day").toISOString(),
    due_at: now.add(25, "day").toISOString(),
    customer: "family.recent@example.com", is_credit_note: false
  },
  {
    id: "CN-2001", status: "paid", total_cents: 15000, currency: "EUR",
    created_at: now.subtract(2, "day").toISOString(),
    due_at: now.subtract(1, "day").toISOString(),
    customer: "credit.note@example.com", is_credit_note: true
  }
];

/* ---------- page ---------- */
export default function BillingHome() {
  const navigate = useNavigate();

  // controls
  const [currency, setCurrency] = useState("EUR");
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | paid | unpaid

  // data
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [hasInvoices, setHasInvoices] = useState(false);

  const load = async (signal) => {
    setLoading(true);
    /* ---- students/parents ---- */
    try {
      const [stRes, pRes] = await Promise.allSettled([
        api.get("/allstudents", { signal }),
        api.get("/parents", { signal }),
      ]);

      const stData = stRes.status === "fulfilled" ? (stRes.value?.data || []) : [];
      const pData = pRes.status === "fulfilled" ? (pRes.value?.data || []) : [];

      setStudents(stData.length ? stData : DUMMY_STUDENTS);
      setParents(pData.length ? pData : DUMMY_PARENTS);
    } catch {
      setStudents(DUMMY_STUDENTS);
      setParents(DUMMY_PARENTS);
    }

    /* ---- invoices ---- */
    try {
      const q =
        dateRange?.length === 2
          ? `/invoices?from=${dateRange[0].startOf("day").toISOString()}&to=${dateRange[1]
              .endOf("day")
              .toISOString()}`
          : "/invoices?range=180d";

      const inv = await api.get(q, { signal });
      const data = inv?.data || [];
      if (Array.isArray(data) && data.length) {
        setInvoices(data);
        setHasInvoices(true);
      } else {
        setInvoices(DUMMY_INVOICES);
        setHasInvoices(false);
      }
    } catch {
      try {
        const inv2 = await api.get("/invoices", { signal });
        const data2 = inv2?.data || [];
        if (Array.isArray(data2) && data2.length) {
          setInvoices(data2);
          setHasInvoices(true);
        } else {
          setInvoices(DUMMY_INVOICES);
          setHasInvoices(false);
        }
      } catch {
        setInvoices(DUMMY_INVOICES);
        setHasInvoices(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  /* ---------- normalize invoices ---------- */
  const normInvoices = useMemo(
    () =>
      (invoices || []).map((i) => ({
        id: i.id || i.stripe_invoice_id || read(i, "raw.id"),
        status: String(i.status || "").toLowerCase(),
        total_cents:
          i.total_cents ?? i.total ?? read(i, "raw.amount_due") ?? read(i, "raw.amount_paid") ?? 0,
        currency: i.currency ?? read(i, "raw.currency") ?? currency,
        created_at:
          i.created_at ??
          i.created ??
          (read(i, "raw.created") ? new Date(read(i, "raw.created") * 1000) : null),
        due_at: i.due_at ?? i.due_date ?? null,
        customer: i.customer_email || read(i, "raw.customer_email") || "",
        is_credit_note: Boolean(i.is_credit_note || i.credit_note),
      })),
    [invoices, currency]
  );

  /* ---------- metrics ---------- */
  const searchedInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normInvoices;
    return normInvoices.filter((i) => `${i.id} ${i.customer}`.toLowerCase().includes(q));
  }, [normInvoices, search]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "paid") return searchedInvoices.filter((i) => i.status === "paid" && !i.is_credit_note);
    if (statusFilter === "unpaid") return searchedInvoices.filter((i) => UNPAID.has(i.status) && !i.is_credit_note);
    return searchedInvoices;
  }, [searchedInvoices, statusFilter]);

  const cur = filteredInvoices[0]?.currency || currency;
  const totalPaidCents = filteredInvoices
    .filter((i) => i.status === "paid" && !i.is_credit_note)
    .reduce((a, b) => a + (b.total_cents || 0), 0);

  const totalUnpaidCents = filteredInvoices
    .filter((i) => UNPAID.has(i.status) && !i.is_credit_note)
    .reduce((a, b) => a + (b.total_cents || 0), 0);

  const totalCreditsCents = filteredInvoices
    .filter((i) => i.is_credit_note)
    .reduce((a, b) => a + (b.total_cents || 0), 0);

  const outstandingCents = totalUnpaidCents;

  const donutData = useMemo(() => {
    const collections = Math.max(0, totalPaidCents - totalCreditsCents);
    const pending = Math.max(0, totalUnpaidCents);
    return [
      { name: "Collections", value: collections / 100 },
      { name: "Pending Due", value: pending / 100 },
    ];
  }, [totalPaidCents, totalCreditsCents, totalUnpaidCents]);

  /* ---------- reminders ---------- */
  const today = new Date();
  const reminders = useMemo(() => {
    const overdue = searchedInvoices
      .filter((i) => UNPAID.has(i.status) && i.due_at && new Date(i.due_at) < today)
      .slice(0, 5)
      .map((i) => ({
        title: `Overdue invoice ${i.id}`,
        date: new Date(i.due_at).toLocaleDateString(),
        tag: "Overdue",
        color: "red",
      }));

    return [
      ...overdue,
      { title: "Send statements to families", date: "", tag: "Reminder", color: "default" },
      { title: "Create tuition charges", date: "", tag: "Task", color: "blue" },
    ].slice(0, 10);
  }, [searchedInvoices]);

  /* ---------- shortcuts ---------- */
  const shortcuts = [
    { label: "Add Parent",  icon: <UsergroupAddOutlined />, onClick: () => navigate("/admin/parents/new"),  color: "blue" },
    { label: "Add Student", icon: <TeamOutlined />,         onClick: () => navigate("/admin/students/new"), color: "green" },
    { label: "Add Teacher", icon: <TeamOutlined />,         onClick: () => navigate("/admin/teachers/new"), color: "purple" },

    { label: "Create Invoices", icon: <FileAddOutlined />, onClick: () => navigate("/admin/billing/invoices/new"), color: "geekblue" },
    { label: "Batch Entry",     icon: <FileSyncOutlined />, onClick: () => navigate("/billing/transactions/batch"), color: "purple" },
    { label: "Enter Payments",  icon: <DollarCircleOutlined />, onClick: () => navigate("/billing/payments/new"), color: "green" },
    { label: "Enter Credits",   icon: <CreditCardOutlined />,   onClick: () => navigate("/billing/credits/new"), color: "gold" },
    { label: "Send Statements", icon: <SendOutlined />,    onClick: () => navigate("/billing/statements"), color: "cyan" },
    { label: "Family Balances", icon: <UsergroupAddOutlined />, onClick: () => navigate("/billing/families/balances"), color: "volcano" },
    { label: "Billing Services", icon: <SettingOutlined />, onClick: () => navigate("/billing/services"), color: "blue" },
  ];

  /* ---------- actions ---------- */
  const refresh = () => load();

  const exportCSV = () => {
    const rows = [
      ["Invoice ID", "Status", "Total", "Currency", "Created", "Due", "Customer", "Credit Note"],
      ...filteredInvoices.map((i) => [
        i.id,
        i.status,
        (i.total_cents || 0) / 100,
        i.currency,
        i.created_at ? new Date(i.created_at).toISOString() : "",
        i.due_at ? new Date(i.due_at).toISOString() : "",
        i.customer || "",
        i.is_credit_note ? "yes" : "no",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- table columns ---------- */
  const invoiceCols = [
    {
      title: "Invoice",
      dataIndex: "id",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.customer || "—"}</Text>
        </Space>
      ),
      width: 220,
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      filters: [
        { text: "Paid", value: "paid" },
        { text: "Open", value: "open" },
        { text: "Past due", value: "past_due" },
        { text: "Uncollectible", value: "uncollectible" },
      ],
      onFilter: (val, rec) => rec.status === val,
      render: (s, r) => (
        <Space>
          <Tag color={STATUS_COLORS[s] || "default"}>{s || "—"}</Tag>
          {r.is_credit_note ? <Badge color="magenta" text="credit note" /> : null}
        </Space>
      ),
    },
    {
      title: "Total",
      dataIndex: "total_cents",
      align: "right",
      render: (c, r) => money((c || 0) / 100, r.currency || cur),
      sorter: (a, b) => (a.total_cents || 0) - (b.total_cents || 0),
      width: 140,
    },
    {
      title: "Due",
      dataIndex: "due_at",
      width: 150,
      render: (v, r) => {
        if (!v) return "—";
        const isOverdue = UNPAID.has(r.status) && new Date(v) < new Date();
        return (
          <Space>
            <span>{new Date(v).toLocaleDateString()}</span>
            {isOverdue ? <Tag color="red">overdue</Tag> : null}
          </Space>
        );
      },
      sorter: (a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 180,
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      defaultSortOrder: "descend",
    },
  ];

  /* ---------- UI ---------- */
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <Card
        hoverable
        variant="borderless"
        styles={{ body: { padding: 16 } }}
        style={{
          background: "linear-gradient(135deg, rgba(22,119,255,0.12) 0%, rgba(250,173,20,0.12) 100%)",
          marginBottom: 16,
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={0}>
              <Title level={3} className="!mb-0">Billing / Overview</Title>
              <Text type="secondary">Collections, dues, and quick actions</Text>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search invoices or customers…"
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260 }}
              />
              <RangePicker value={dateRange} onChange={setDateRange} allowClear={false} />
              <Select
                value={currency}
                onChange={setCurrency}
                options={["EUR", "USD", "ZAR"].map((c) => ({ value: c, label: c }))}
                style={{ width: 92 }}
              />
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined />} onClick={refresh} />
              </Tooltip>
              <Tooltip title="Export invoices CSV">
                <Button icon={<DownloadOutlined />} onClick={exportCSV} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left column tiles */}
        <Col xs={24} md={12} xl={6}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Card hoverable variant="outlined" style={{ borderLeft: "4px solid #1677ff" }}>
              <Space align="center">
                <TeamOutlined style={{ fontSize: 28, color: "#1677ff" }} />
                <div>
                  <Text type="secondary">Students</Text>
                  <div><Statistic value={students.length} /></div>
                </div>
              </Space>
            </Card>

            <Card hoverable variant="outlined" style={{ borderLeft: "4px solid #fa8c16" }}>
              <Space align="center">
                <UsergroupAddOutlined style={{ fontSize: 28, color: "#fa8c16" }} />
                <div>
                  <Text type="secondary">Families</Text>
                  <div><Statistic value={parents.length} /></div>
                </div>
              </Space>
            </Card>

            <Card hoverable variant="outlined" style={{ borderLeft: "4px solid #52c41a" }}>
              <Space align="center">
                <DollarCircleOutlined style={{ fontSize: 28, color: "#52c41a" }} />
                <div>
                  <Text type="secondary">Outstanding</Text>
                  <div><Statistic value={money((outstandingCents || 0) / 100, cur)} /></div>
                </div>
              </Space>
            </Card>

            <Card hoverable variant="outlined" style={{ borderLeft: "4px solid #eb2f96" }}>
              <Space align="center">
                <FileDoneOutlined style={{ fontSize: 28, color: "#eb2f96" }} />
                <div>
                  <Text type="secondary">Receipts</Text>
                  <div><Statistic value={money((totalPaidCents || 0) / 100, cur)} /></div>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>

        {/* Middle column: Shortcuts + Donut */}
        <Col xs={24} md={12}>
          <Card hoverable variant="outlined" title="Shortcuts" className="mb-4">
            <Row gutter={[12, 12]}>
              {shortcuts.map((s) => (
                <Col key={s.label} xs={12} md={8}>
                  <Button
                    block
                    size="large"
                    onClick={s.onClick}
                    icon={s.icon}
                    type="default"
                    style={{ borderColor: "transparent", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}
                  >
                    <Tag color={s.color} style={{ marginRight: 8 }}>{s.label}</Tag>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>

          <Card
            hoverable
            variant="outlined"
            title={
              <Space align="center">
                <PieChartOutlined />
                Total Collections vs Pending
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "All", value: "all" },
                  { label: "Paid", value: "paid" },
                  { label: "Unpaid", value: "unpaid" },
                ]}
              />
            }
          >
            <div style={{ width: "100%", height: 280 }}>
              {loading ? (
                <Skeleton active />
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      label={(d) => `${d.name}: ${money(d.value, cur)}`}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={`c-${i}`} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip formatter={(v) => money(v, cur)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {!hasInvoices && (
              <div className="mt-2">
                <Tooltip title="Expose GET /invoices to drive amounts">
                  <Tag>connect /invoices</Tag>
                </Tooltip>
              </div>
            )}
          </Card>
        </Col>

        {/* Right column: Reminders */}
        <Col xs={24} md={6}>
          <Card
            hoverable
            variant="outlined"
            title="Reminders"
            extra={<Tag color="blue">{reminders.length}</Tag>}
            style={{ minHeight: 280 }}
          >
            {loading ? (
              <Skeleton active />
            ) : reminders.length ? (
              <List
                itemLayout="horizontal"
                dataSource={reminders}
                renderItem={(item, idx) => (
                  <List.Item className={idx % 2 ? "bg-[rgba(0,0,0,0.02)]" : ""}>
                    <List.Item.Meta
                      avatar={<PieChartOutlined style={{ fontSize: 18 }} />}
                      title={<span>{item.title}</span>}
                      description={
                        <Space>
                          {item.date && <Text type="secondary">{item.date}</Text>}
                          <Tag color={item.color}>{item.tag}</Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No reminders" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom row: Recent invoices + Legend */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16}>
          <Card
            hoverable
            variant="outlined"
            title="Recent Invoices"
            extra={<Text type="secondary">{filteredInvoices.length} shown</Text>}
          >
            <Table
              rowKey="id"
              size="middle"
              dataSource={[...filteredInvoices]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 12)}
              columns={invoiceCols}
              pagination={{ pageSize: 12, showSizeChanger: false }}
              loading={loading}
              onRow={(r) => ({
                onClick: () => navigate(`/admin/billing/invoices/${encodeURIComponent(r.id)}`),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card hoverable variant="outlined" title="Status Legend">
            <Space direction="vertical">
              <Space><Tag color="green">paid</Tag><Text type="secondary">Paid in full</Text></Space>
              <Space><Tag color="orange">open</Tag><Text type="secondary">Issued; not due/paid yet</Text></Space>
              <Space><Tag color="red">past_due</Tag><Text type="secondary">Past due date; unpaid</Text></Space>
              <Space><Tag color="volcano">uncollectible</Tag><Text type="secondary">Marked as bad debt</Text></Space>
              <Space><Badge color="magenta" text="credit note" /><Text type="secondary">Negative adjustment</Text></Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
