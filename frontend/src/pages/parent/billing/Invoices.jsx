// src/pages/parent/billing/Invoices.jsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Col,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Tooltip,
  message,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  CreditCardOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";
import { NUNITO_FONT_STACK } from "@/constants/fonts";
import PlainBackground from "@/components/layouts/PlainBackground";

const { Title, Text } = Typography;

/* ----------------------- helpers ----------------------- */
const money = (v, currency = "EUR") => {
  // Ensure currency is always a valid string, default to EUR
  const validCurrency = currency && typeof currency === 'string' ? currency : "EUR";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: validCurrency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
};

const statusTag = (s) => {
  const t = String(s).toLowerCase();
  if (t === "paid") return <Tag color="green">Paid</Tag>;
  if (t === "overdue") return <Tag color="red">Overdue</Tag>;
  if (t === "refunded") return <Tag color="gold">Refunded</Tag>;
  return <Tag color="blue">Due</Tag>;
};

  // Helper function to transform backend invoice to frontend format
const transformInvoice = (backendInvoice, children = []) => {
  // Ensure children is always an array
  const childrenArray = Array.isArray(children) ? children : [];
  // Handle different amount formats
  let amount = 0;
  if (backendInvoice.total_cents) {
    amount = backendInvoice.total_cents / 100;
  } else if (backendInvoice.amount) {
    amount = typeof backendInvoice.amount === 'number' ? backendInvoice.amount : parseFloat(backendInvoice.amount);
  } else if (backendInvoice.total) {
    amount = typeof backendInvoice.total === 'number' ? backendInvoice.total : parseFloat(backendInvoice.total);
  }
  
  const currency = backendInvoice.currency || "EUR";
  const status = String(backendInvoice.status || "due").toLowerCase();
  
  // Parse invoice lines from JSONB - handle both object and string formats
  let lines = [];
  if (backendInvoice.lines) {
    if (typeof backendInvoice.lines === 'string') {
      try {
        lines = JSON.parse(backendInvoice.lines);
      } catch (e) {
        console.warn("Could not parse invoice lines:", e);
        lines = [];
      }
    } else if (Array.isArray(backendInvoice.lines)) {
      lines = backendInvoice.lines;
    } else if (typeof backendInvoice.lines === 'object') {
      lines = backendInvoice.lines.data || backendInvoice.lines.items || [];
    }
  }
  
  // Extract items from lines
  const items = Array.isArray(lines) && lines.length > 0
    ? lines.map(line => {
        const lineAmount = line.amount || line.price?.unit_amount || line.price?.amount || 0;
        const lineTotal = typeof lineAmount === 'number' ? lineAmount : parseFloat(lineAmount);
        return {
          name: line.description || line.name || line.plan?.name || "Subscription",
          qty: line.quantity || 1,
          unit: (lineTotal / 100) || amount,
          total: (lineTotal / 100) || amount,
        };
      })
    : [{
        name: "Subscription",
        qty: 1,
        unit: amount,
        total: amount,
      }];

  // Get due date - try to extract from invoice data or calculate
  let dueDate;
  if (backendInvoice.due_date) {
    dueDate = backendInvoice.due_date;
  } else if (backendInvoice.created_at) {
    // Calculate due date (30 days from creation, or use period_end if available)
    const created = dayjs(backendInvoice.created_at);
    dueDate = created.add(30, "day").toISOString();
  } else {
    dueDate = dayjs().add(30, "day").toISOString();
  }

  // Normalize status
  let normalizedStatus = status;
  if (status === "paid" || status === "succeeded") {
    normalizedStatus = "paid";
  } else if (status === "open" || status === "pending") {
    normalizedStatus = "due";
  } else if (status === "void" || status === "uncollectible") {
    normalizedStatus = "overdue";
  }

  // Get invoice ID - prefer Stripe invoice ID
  const invoiceId = backendInvoice.stripe_invoice_id || 
                   backendInvoice.invoice_number || 
                   `INV-${backendInvoice.id}`;

  // Extract children names - use all parent's children since invoices don't have direct student link
  const childrenNames = childrenArray.map((c) => {
    if (c.user) {
      const firstName = c.user.first_name || '';
      const lastName = c.user.last_name || '';
      return `${firstName} ${lastName}`.trim() || c.user.name || "Child";
    }
    return c.name || `Student #${c.id}`;
  }).filter(Boolean);

  return {
    id: invoiceId,
    date: backendInvoice.created_at || dayjs().toISOString(),
    due_date: dueDate,
    status: normalizedStatus,
    amount: amount || 0,
    currency: currency,
    children: childrenNames,
    items: items,
    pdf_url: backendInvoice.pdf_url || backendInvoice.hosted_invoice_url,
    stripe_invoice_id: backendInvoice.stripe_invoice_id,
    raw: backendInvoice, // Store raw data for reference
  };
};

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
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState(null); // [dayjs, dayjs] | null
  const [seg, setSeg] = useState("all"); // all | due | paid | overdue
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch invoices from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user to find parent_id
      const userRes = await api.get("/current-user");
      const userId = userRes.data?.id;

      if (userId) {
        // Get parent record
        const parentRes = await api.get("/parents", { params: { user_id: userId } });
        const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
        const parent = parents.find(p => p.user_id === userId) || parents[0];

        if (parent?.id) {
          // Get children for invoice display - fetch all students for this parent
          let children = [];
          try {
            // Fetch all students and filter by parent_id
            const studentsRes = await api.get("/allstudents");
            const allStudents = Array.isArray(studentsRes.data) 
              ? studentsRes.data 
              : (studentsRes.data?.data || []);
            
            // Filter students by parent_id and include user data
            const parentStudents = allStudents
              .filter(s => s.parent_id === parent.id)
              .map(s => ({
                ...s,
                name: s.user?.first_name 
                  ? `${s.user.first_name} ${s.user.last_name || ''}`.trim()
                  : `Student #${s.id}`,
              }));
            
            children = parentStudents;
          } catch (e) {
            console.warn("Could not fetch children:", e);
            // Fallback: try to get from parent detail endpoint
            try {
              const parentDetailRes = await api.get(`/parent/${parent.id}`);
              const parentData = parentDetailRes.data?.data || parentDetailRes.data || parent;
              children = Array.isArray(parentData.student) ? parentData.student : [];
            } catch (e2) {
              console.warn("Could not fetch parent details for children:", e2);
            }
          }

          // Fetch invoices directly from invoices endpoint with parent_id filter
          let invs = [];
          try {
            const invoicesRes = await api.get("/invoices", { params: { parent_id: parent.id } });
            
            invs = Array.isArray(invoicesRes.data) 
              ? invoicesRes.data 
              : (invoicesRes.data?.data || invoicesRes.data?.invoices || []);
            
            if (invs.length === 0) {
              console.warn(`⚠️ [Invoices] No invoices found for parent ${parent.id}`);
            }
          } catch (err) {
            console.error("❌ [Invoices] Could not fetch invoices directly:", err);
            console.error("❌ [Invoices] Error details:", err.response?.data || err.message);
            
            // Fallback: try to get from parent data
            try {
              const parentDetailRes = await api.get(`/parent/${parent.id}`);
              const parentData = parentDetailRes.data?.data || parentDetailRes.data || parent;
              
              // Try both singular and plural forms
              if (Array.isArray(parentData.invoice)) {
                invs = parentData.invoice;
              } else if (Array.isArray(parentData.invoices)) {
                invs = parentData.invoices;
              } else {
                invs = [];
              }
            } catch (e) {
              console.error("❌ [Invoices] Failed to fetch invoices from parent data:", e);
              invs = [];
            }
          }
          
          // Transform invoices to frontend format
          const transformed = invs
            .filter(inv => {
              const isValid = inv && (inv.id || inv.stripe_invoice_id);
              if (!isValid) {
                console.warn(`⚠️ [Invoices] Skipping invalid invoice:`, inv);
              }
              return isValid;
            })
            .map(inv => {
              const transformed = transformInvoice(inv, children);
              return transformed;
            });
          
          const sorted = transformed.sort((a, b) => new Date(b.date) - new Date(a.date));
          setInvoices(sorted);
        } else {
          console.warn(`⚠️ [Invoices] No parent found for user ${userId}`);
          setInvoices([]);
        }
      } else {
        console.warn(`⚠️ [Invoices] No user ID found`);
        setInvoices([]);
      }
    } catch (err) {
      console.error("❌ [Invoices] Failed to load invoices:", err);
      console.error("❌ [Invoices] Error stack:", err.stack);
      message.error("Failed to load invoices. Please try again.");
      setInvoices([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = () => {
    fetchData();
    message.success("Invoices refreshed");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const bySearch =
        !q ||
        inv.id.toLowerCase().includes(q) ||
        (inv.children && inv.children.join(", ").toLowerCase().includes(q));
      const bySeg = seg === "all" ? true : String(inv.status).toLowerCase() === seg;
      const byRange =
        !range ||
        (dayjs(inv.date).isAfter(range[0].startOf("day")) &&
          dayjs(inv.date).isBefore(range[1].endOf("day")));
      return bySearch && bySeg && byRange;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [invoices, query, seg, range]);

  const kpis = useMemo(() => {
    const outstanding = invoices.filter((i) =>
      ["due", "overdue"].includes(String(i.status).toLowerCase())
    ).reduce((s, x) => {
      // Use the invoice's currency for calculation
      const amount = x.amount || 0;
      return s + amount;
    }, 0);
    const last30paid = invoices.filter(
      (i) => i.status === "paid" && dayjs(i.date).isAfter(dayjs().subtract(30, "day"))
    ).reduce((s, x) => {
      const amount = x.amount || 0;
      return s + amount;
    }, 0);
    return { outstanding, last30paid, count: filtered.length };
  }, [invoices, filtered.length]);

  const columns = [
    { 
      title: "Invoice", 
      dataIndex: "id", 
      key: "id", 
      width: 130,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
      width: 130,
    },
    {
      title: "Due",
      dataIndex: "due_date",
      key: "due_date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
      width: 130,
    },
    {
      title: "Children",
      dataIndex: "children",
      key: "children",
      render: (arr, record) => {
        if (!Array.isArray(arr) || arr.length === 0) {
          return <Text type="secondary">—</Text>;
        }
        
        const childrenText = arr.join(", ");
        
        // Show first 2 children, then count if more
        const childrenList = arr.slice(0, 2);
        const remaining = arr.length - 2;
        const displayText = childrenList.join(", ") + (remaining > 0 ? ` +${remaining} more` : "");
        
        return (
          <Tooltip title={childrenText} placement="topLeft">
            <Text style={{ maxWidth: '200px', display: 'block' }} ellipsis>
              {displayText}
            </Text>
          </Tooltip>
        );
      },
      width: 200,
      ellipsis: true,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (_, r) => (
        <Text strong>{money(r.amount, r.currency)}</Text>
      ),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: statusTag,
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      align: "center",
      render: (_, rec) => {
        const menuItems = [
          {
            key: "view",
            label: "View",
            icon: <EyeOutlined />,
            onClick: () => {
              setActive(rec);
              setOpen(true);
            },
          },
          {
            key: "pdf",
            label: "Download PDF",
            icon: <DownloadOutlined />,
            onClick: () => {
              if (rec.pdf_url && rec.pdf_url !== '#') {
                window.open(rec.pdf_url, '_blank');
              } else {
                openPrintable(rec);
              }
            },
          },
        ];

        // Add Pay option if invoice is due or overdue
        if (["due", "overdue"].includes(rec.status)) {
          menuItems.push({
            key: "pay",
            label: "Pay",
            icon: <CreditCardOutlined />,
            onClick: () => navigate("/parent/billing/subscription"),
          });
        }

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              style={{ padding: '0 8px' }}
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  className="!p-0 !h-auto text-neutral-600"
                  onClick={() => navigate("/parent/billing/overview")}
                  aria-label="Back to billing overview"
                />
                <div>
                  <Title level={3} className="!mb-0">
                    Invoices
                  </Title>
                  <Text type="secondary">Your billing history and payments.</Text>
                </div>
              </div>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                Refresh
              </Button>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                  {loading ? <Spin /> : (
                    <>
                      <div className="text-sm text-gray-500">Outstanding</div>
                      <div className="text-2xl font-extrabold text-red-500">{money(kpis.outstanding, "EUR")}</div>
                    </>
                  )}
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                  {loading ? <Spin /> : (
                    <>
                      <div className="text-sm text-gray-500">Paid (30 days)</div>
                      <div className="text-2xl font-extrabold text-green-600">{money(kpis.last30paid, "EUR")}</div>
                    </>
                  )}
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                  {loading ? <Spin /> : (
                    <>
                      <div className="text-sm text-gray-500">Total invoices</div>
                      <div className="text-2xl font-extrabold text-neutral-800">{kpis.count}</div>
                    </>
                  )}
                </div>
              </Col>
            </Row>

            <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
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
            </div>

            <div className="mobile-only">
              {loading ? (
                <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                  <div className="py-8 text-center">
                    <Spin size="large" />
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                  <Empty description="No invoices match your filters." />
                </div>
              ) : (
                <List
                  dataSource={filtered}
                  renderItem={(inv) => (
                    <div className="mb-3 rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm" key={inv.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{inv.id}</div>
                          <div className="text-sm text-gray-500">
                            {dayjs(inv.date).format("MMM D, YYYY")} · Due {dayjs(inv.due_date).format("MMM D")}
                          </div>
                          <Tooltip title={inv.children.join(", ")}>
                            <div className="mt-1 line-clamp-2 text-sm text-gray-600">
                              {inv.children.length > 2
                                ? `${inv.children.slice(0, 2).join(", ")} +${inv.children.length - 2} more`
                                : inv.children.join(", ")}
                            </div>
                          </Tooltip>
                          <div className="mt-2">{statusTag(inv.status)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{money(inv.amount, inv.currency)}</div>
                          <div className="mt-2">
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: "view",
                                    label: "View",
                                    icon: <EyeOutlined />,
                                    onClick: () => {
                                      setActive(inv);
                                      setOpen(true);
                                    },
                                  },
                                  {
                                    key: "pdf",
                                    label: "Download PDF",
                                    icon: <DownloadOutlined />,
                                    onClick: () => {
                                      if (inv.pdf_url && inv.pdf_url !== "#") {
                                        window.open(inv.pdf_url, "_blank");
                                      } else {
                                        openPrintable(inv);
                                      }
                                    },
                                  },
                                  ...(["due", "overdue"].includes(inv.status)
                                    ? [
                                        {
                                          key: "pay",
                                          label: "Pay",
                                          icon: <CreditCardOutlined />,
                                          onClick: () => navigate("/parent/billing/subscription"),
                                        },
                                      ]
                                    : []),
                                ],
                              }}
                              trigger={["click"]}
                              placement="bottomRight"
                            >
                              <Button type="text" icon={<MoreOutlined />} size="small" />
                            </Dropdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>

            <div className="desktop-only">
              <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm">
                {loading ? (
                  <div className="py-8 text-center">
                    <Spin size="large" />
                  </div>
                ) : filtered.length === 0 ? (
                  <Empty description="No invoices match your filters." />
                ) : (
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={filtered}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: false,
                      showTotal: (total) => `Total ${total} invoices`,
                    }}
                    scroll={{ x: 1000 }}
                    size="middle"
                  />
                )}
              </div>
            </div>
        </div>
      </div>

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

              <div className="rounded-xl bg-white/80 backdrop-blur p-4 shadow-sm">
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
              </div>

              <Space className="mt-4">
                {["due", "overdue"].includes(active.status) && (
                  <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    onClick={() => navigate("/parent/billing/subscription")}
                  >
                    Pay now
                  </Button>
                )}
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={() => {
                    if (active.pdf_url && active.pdf_url !== '#') {
                      window.open(active.pdf_url, '_blank');
                    } else {
                      openPrintable(active);
                    }
                  }}
                >
                  Download PDF
                </Button>
              </Space>
            </>
          )}
        </Drawer>
      </div>
    </PlainBackground>
  );
}
