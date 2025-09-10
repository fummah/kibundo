// src/pages/parent/billing/Invoices.jsx
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import DeviceFrame from "@/components/student/mobile/DeviceFrame";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Title, Text } = Typography;

/* ----------------------- helpers ----------------------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const statusTag = (s) => {
  const t = String(s).toLowerCase();
  if (t === "paid") return <Tag color="green">Paid</Tag>;
  if (t === "overdue") return <Tag color="red">Overdue</Tag>;
  if (t === "refunded") return <Tag color="gold">Refunded</Tag>;
  return <Tag color="blue">Due</Tag>;
};

/* ----------------------- dummy invoices ----------------------- */
const DUMMY = [
  {
    id: "INV-2025-001",
    date: dayjs().subtract(2, "day").toISOString(),
    due_date: dayjs().add(12, "day").toISOString(),
    status: "due",
    amount: 29.99,
    currency: "EUR",
    children: ["Name Child one"],
    items: [{ name: "Monthly Family plan", qty: 1, unit: 29.99, total: 29.99 }],
  },
  {
    id: "INV-2025-000",
    date: dayjs().subtract(28, "day").toISOString(),
    due_date: dayjs().subtract(13, "day").toISOString(),
    status: "paid",
    amount: 29.99,
    currency: "EUR",
    children: ["Name Child one"],
    items: [{ name: "Monthly Family plan", qty: 1, unit: 29.99, total: 29.99 }],
  },
  {
    id: "INV-2024-012",
    date: dayjs().subtract(43, "day").toISOString(),
    due_date: dayjs().subtract(13, "day").toISOString(),
    status: "overdue",
    amount: 19.99,
    currency: "EUR",
    children: ["Name Child two"],
    items: [{ name: "Monthly Starter", qty: 1, unit: 19.99, total: 19.99 }],
  },
];

/* ----------------------- printable HTML ----------------------- */
function openPrintable(invoice) {
  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoice.id}</title>
<style>
  body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:24px; }
  h1{ margin:0 0 8px; }
  .muted{ color:#666; }
  table{ width:100%; border-collapse: collapse; margin-top:16px; }
  th, td{ padding:10px; border-bottom:1px solid #eee; text-align:left; }
  .totals{ margin-top:16px; float:right; width: 260px; }
  .totals div{ display:flex; justify-content:space-between; padding:6px 0; }
</style>
</head>
<body>
  <h1>Invoice ${invoice.id}</h1>
  <div class="muted">
    Date: ${dayjs(invoice.date).format("YYYY-MM-DD")} ·
    Due: ${dayjs(invoice.due_date).format("YYYY-MM-DD")}
  </div>
  <div class="muted">Status: ${invoice.status.toUpperCase()}</div>
  <div class="muted">Children: ${invoice.children.join(", ")}</div>

  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
    <tbody>
      ${invoice.items
        .map(
          (it) => `<tr>
        <td>${it.name}</td>
        <td>${it.qty}</td>
        <td>${money(it.unit, invoice.currency)}</td>
        <td>${money(it.total, invoice.currency)}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div><strong>Total</strong><strong>${money(invoice.amount, invoice.currency)}</strong></div>
  </div>

  <script>window.print()</script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (!w) return message.warning("Pop-up blocked. Allow pop-ups to print.");
  w.document.write(html);
  w.document.close();
}

/* ----------------------- page ----------------------- */
export default function Invoices() {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState(null); // [dayjs, dayjs] | null
  const [seg, setSeg] = useState("all"); // all | due | paid | overdue
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  const refresh = () => {
    message.success("Invoices refreshed");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUMMY.filter((inv) => {
      const bySearch =
        !q ||
        inv.id.toLowerCase().includes(q) ||
        inv.children.join(", ").toLowerCase().includes(q);
      const bySeg = seg === "all" ? true : String(inv.status).toLowerCase() === seg;
      const byRange =
        !range ||
        (dayjs(inv.date).isAfter(range[0].startOf("day")) &&
          dayjs(inv.date).isBefore(range[1].endOf("day")));
      return bySearch && bySeg && byRange;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [query, seg, range]);

  const kpis = useMemo(() => {
    const outstanding = DUMMY.filter((i) =>
      ["due", "overdue"].includes(String(i.status).toLowerCase())
    ).reduce((s, x) => s + x.amount, 0);
    const last30paid = DUMMY.filter(
      (i) => i.status === "paid" && dayjs(i.date).isAfter(dayjs().subtract(30, "day"))
    ).reduce((s, x) => s + x.amount, 0);
    return { outstanding, last30paid, count: filtered.length };
  }, [filtered.length]);

  const columns = [
    { title: "Invoice", dataIndex: "id", key: "id", width: 150 },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (v) => dayjs(v).format("YYYY-MM-DD"),
      width: 120,
    },
    {
      title: "Due",
      dataIndex: "due_date",
      key: "due_date",
      render: (v) => dayjs(v).format("YYYY-MM-DD"),
      width: 120,
    },
    {
      title: "Child",
      dataIndex: "children",
      key: "children",
      render: (arr) => arr.join(", "),
      ellipsis: true,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (_, r) => money(r.amount, r.currency),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: statusTag,
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      render: (_, rec) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setActive(rec);
              setOpen(true);
            }}
          >
            View
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => openPrintable(rec)}>
            Download
          </Button>
          {["due", "overdue"].includes(rec.status) && (
            <Button
              size="small"
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={() => message.success(`Payment flow for ${rec.id}`)}
            >
              Pay
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <DeviceFrame showFooterChat={false} className="bg-neutral-100">
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: `url(${globalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Scrollable content (bottom tab bar lives inside this element) */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6 pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <Title level={2} className="!m-0">
                  Invoices
                </Title>
                <p className="text-gray-600 m-0">Your billing history and payments.</p>
              </div>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                Refresh
              </Button>
            </div>

            {/* KPI cards */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card className="rounded-2xl shadow-sm">
                  <div className="text-gray-500 text-sm">Outstanding</div>
                  <div className="text-2xl font-extrabold text-red-500">
                    {money(kpis.outstanding)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="rounded-2xl shadow-sm">
                  <div className="text-gray-500 text-sm">Paid (Last 30 days)</div>
                  <div className="text-2xl font-extrabold text-green-600">
                    {money(kpis.last30paid)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="rounded-2xl shadow-sm">
                  <div className="text-gray-500 text-sm">Invoices</div>
                  <div className="text-2xl font-extrabold">{kpis.count}</div>
                </Card>
              </Col>
            </Row>

            {/* Filters */}
            <Card className="rounded-2xl shadow-sm">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={10}>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search invoice # or child name"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="rounded-xl"
                  />
                </Col>
                <Col xs={24} md={8}>
                  <DatePicker.RangePicker
                    className="w-full rounded-xl"
                    value={range}
                    onChange={(vals) => setRange(vals && vals[0] && vals[1] ? vals : null)}
                  />
                </Col>
                <Col xs={24} md={6} className="md:flex md:justify-end">
                  <Segmented
                    options={[
                      { label: "All", value: "all" },
                      { label: "Due", value: "due" },
                      { label: "Paid", value: "paid" },
                      { label: "Overdue", value: "overdue" },
                    ]}
                    value={seg}
                    onChange={setSeg}
                  />
                </Col>
              </Row>
            </Card>

            {/* Mobile list */}
            <div className="mobile-only">
              {filtered.length === 0 ? (
                <Card className="rounded-2xl shadow-sm">
                  <Empty description="No invoices match your filters." />
                </Card>
              ) : (
                <List
                  dataSource={filtered}
                  renderItem={(inv) => (
                    <Card className="rounded-2xl shadow-sm mb-3" key={inv.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{inv.id}</div>
                          <div className="text-gray-500 text-sm">
                            {dayjs(inv.date).format("MMM D, YYYY")} · Due{" "}
                            {dayjs(inv.due_date).format("MMM D")}
                          </div>
                          <div className="text-gray-600 text-sm mt-1">
                            {inv.children.join(", ")}
                          </div>
                          <div className="mt-2">{statusTag(inv.status)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{money(inv.amount)}</div>
                          <Space className="mt-2">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setActive(inv);
                                setOpen(true);
                              }}
                            />
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => openPrintable(inv)}
                            />
                          </Space>
                        </div>
                      </div>
                    </Card>
                  )}
                />
              )}
            </div>

            {/* Desktop table */}
            <div className="desktop-only">
              <Card className="rounded-2xl shadow-sm">
                {filtered.length === 0 ? (
                  <Empty description="No invoices match your filters." />
                ) : (
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={filtered}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                  />
                )}
              </Card>
            </div>

            {/* Give some breathing room before the bottom bar */}
            <div className="h-6" />
          </div>

          {/* Prevent content from being hidden by the bottom nav */}
          <ParentTabSpacer />

          {/* Bottom nav inside the scroll container */}
          <BottomTabBar />
        </main>
      </div>

      {/* Drawer details */}
      <Drawer
        title={active ? `Invoice ${active.id}` : "Invoice"}
        open={open}
        onClose={() => setOpen(false)}
        width={520}
      >
        {!active ? null : (
          <>
            <Space direction="vertical" size={4} className="mb-3">
              <Text type="secondary">Date: {dayjs(active.date).format("YYYY-MM-DD")}</Text>
              <Text type="secondary">Due: {dayjs(active.due_date).format("YYYY-MM-DD")}</Text>
              <div>Children: {active.children.join(", ")}</div>
              <div>Status: {statusTag(active.status)}</div>
            </Space>

            <Card size="small" className="rounded-xl">
              <Row className="font-semibold mb-2">
                <Col span={12}>Item</Col>
                <Col span={4}>Qty</Col>
                <Col span={4}>Unit</Col>
                <Col span={4} className="text-right">
                  Total
                </Col>
              </Row>
              {(active.items || []).map((it, i) => (
                <Row key={i} className="py-1 border-t border-gray-100">
                  <Col span={12}>{it.name}</Col>
                  <Col span={4}>{it.qty}</Col>
                  <Col span={4}>{money(it.unit, active.currency)}</Col>
                  <Col span={4} className="text-right">
                    {money(it.total, active.currency)}
                  </Col>
                </Row>
              ))}
              <Row className="pt-3 mt-2 border-t">
                <Col span={20} className="text-right font-semibold">
                  Total
                </Col>
                <Col span={4} className="text-right font-bold">
                  {money(active.amount, active.currency)}
                </Col>
              </Row>
            </Card>

            <Space className="mt-4">
              {["due", "overdue"].includes(active.status) && (
                <Button
                  type="primary"
                  icon={<CreditCardOutlined />}
                  onClick={() => message.success(`Payment flow for ${active.id}`)}
                >
                  Pay now
                </Button>
              )}
              <Button icon={<DownloadOutlined />} onClick={() => openPrintable(active)}>
                Download
              </Button>
            </Space>
          </>
        )}
      </Drawer>
    </DeviceFrame>
  );
}
