// src/pages/admin/AnalyticsDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  UserOutlined,
  TeamOutlined,
  RiseOutlined,
  SmileOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Divider,
  Space,
  Tabs,
  Spin,
  message,
  Select,
} from "antd";
import dayjs from "dayjs";
import { Users } from "lucide-react";

const { Title, Text } = Typography;

const clampNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatNumber = (num) => Math.trunc(clampNum(num)).toLocaleString();

const formatCurrency = (value, currency = "EUR") =>
  clampNum(value).toLocaleString("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toSnake = (value = "") =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const getFieldValue = (item, field) => {
  if (!item || !field) return undefined;
  if (item[field] !== undefined) return item[field];
  const snakeField = toSnake(field);
  if (snakeField !== field && item[snakeField] !== undefined) {
    return item[snakeField];
  }
  return undefined;
};

const extractSubscriptionAmount = (subscription) => {
  if (!subscription) return { amount: 0, currency: "EUR" };

  let raw = getFieldValue(subscription, "raw");
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  let currency =
    getFieldValue(subscription, "currency") ||
    getFieldValue(getFieldValue(subscription, "product"), "currency") ||
    raw?.subscription?.items?.data?.[0]?.price?.currency ||
    raw?.checkout_session?.currency ||
    "EUR";

  let amount =
    getFieldValue(subscription, "amount") ??
    getFieldValue(subscription, "total") ??
    getFieldValue(subscription, "total_amount") ??
    getFieldValue(getFieldValue(subscription, "product"), "price") ??
    0;

  if (raw?.subscription?.items?.data?.[0]?.price?.unit_amount) {
    amount = raw.subscription.items.data[0].price.unit_amount / 100;
    currency =
      raw.subscription.items.data[0].price.currency?.toUpperCase() || currency;
  } else if (raw?.checkout_session?.amount_total) {
    amount = raw.checkout_session.amount_total / 100;
    currency =
      raw.checkout_session.currency?.toUpperCase() || currency;
  } else if (raw?.latest_invoice?.amount_paid) {
    amount = raw.latest_invoice.amount_paid / 100;
    currency =
      raw.latest_invoice.currency?.toUpperCase() || currency;
  }

  return {
    amount: clampNum(amount),
    currency: currency ? String(currency).toUpperCase() : "EUR",
  };
};

const pickStatus = (sub) => {
  const status = String(getFieldValue(sub, "status") || "").toLowerCase();
  if (["active", "trialing"].includes(status)) return "active";
  if (["expired"].includes(status)) return "expired";
  if (["canceled", "cancelled"].includes(status)) return "canceled";
  if (["pending", "unpaid", "incomplete"].includes(status)) return "pending";
  return "unknown";
};

const StatCard = ({ title, value, subtext, icon }) => {
  const displayValue =
    typeof value === "number" ? formatNumber(value) : value;

  return (
  <Card hoverable className="transition-shadow duration-300 shadow-md">
    <Space align="start">
      <div className="text-blue-500 text-2xl">{icon}</div>
      <div>
        <Text type="secondary">{title}</Text>
        <Title level={4} style={{ margin: 0 }}>{displayValue}</Title>
        {subtext && <Text type="success">{subtext}</Text>}
      </div>
    </Space>
  </Card>
  );
};

const getDateRangeForFilter = (filter) => {
  const days = Number(filter) || 7;
  const end = dayjs().endOf("day");
  const start = end.clone().subtract(days, "day").startOf("day");
  return { start, end };
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({});
  const [revenue, setRevenue] = useState({});
  const [revenueBreakdown, setRevenueBreakdown] = useState({
    subscriptionRevenue: 0,
    activeSubscriptionRevenue: 0,
    invoiceRevenue: 0,
    totalRevenue: 0,
    activeCount: 0,
    currency: "EUR",
    subscriptionCurrency: "EUR",
  });
  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [filter, setFilter] = useState("30");
  const dateRange = useMemo(() => getDateRangeForFilter(filter), [filter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { start, end } = dateRange;
        const dateParams = {
          startDate: start.format("YYYY-MM-DD"),
          endDate: end.format("YYYY-MM-DD"),
        };

        const [analyticsRes, overviewRes, subscriptionsRes, invoicesRes] =
          await Promise.allSettled([
            api.get("/analytics/dashboard", {
              params: { days: filter },
              withCredentials: true,
            }),
            api.get("/admin/dashboard", { withCredentials: true }),
            api.get("/subscriptions", {
              params: dateParams,
              withCredentials: true,
            }),
            api.get("/invoices", {
              params: dateParams,
              withCredentials: true,
            }),
          ]);

        if (analyticsRes.status === "fulfilled") {
          const a = analyticsRes.value?.data ?? {};
          const statsPayload =
            a.stats ?? a.stats_summary ?? a.metrics ?? {};
          const customerInsights =
            a.customerInsights ?? a.customer_insights ?? {};
          const revenuePayload = a.revenue ?? {};
          const lineSeries =
            Array.isArray(a.lineData)
              ? a.lineData
              : Array.isArray(a.user_growth)
              ? a.user_growth
              : [];
          const barSeries =
            Array.isArray(a.barData)
              ? a.barData
              : Array.isArray(a.quarterly_revenue)
              ? a.quarterly_revenue
              : [];

          setStats({
            totalUsers: clampNum(
              statsPayload.totalUsers ?? statsPayload.total_users ?? stats.totalUsers ?? 0
            ),
            activeUsers: clampNum(
              statsPayload.activeUsers ?? statsPayload.active_users ?? stats.activeUsers ?? 0
            ),
            newUsers: clampNum(
              statsPayload.newUsers ?? statsPayload.new_users ?? stats.newUsers ?? 0
            ),
          });

          setInsights({
            satisfaction:
              clampNum(
                customerInsights.satisfaction ??
                  customerInsights.csat ??
                  customerInsights.csat_score ??
                  0
              ) || 0,
            sessionDuration:
              clampNum(
                customerInsights.sessionDuration ??
                  customerInsights.avg_session_minutes ??
                  customerInsights.avg_session ??
                  0
              ) || 0,
            retentionRate:
              clampNum(
                customerInsights.retentionRate ??
                  customerInsights.retention_rate ??
                  0
              ) || 0,
          });

          const currency =
            (revenuePayload.currency ||
              revenuePayload.currency_code ||
              "EUR")
              .toString()
              .toUpperCase();

          setRevenue({
            total:
              clampNum(
                revenuePayload.total ??
                  revenuePayload.total_revenue ??
                  0
              ) || 0,
            subscriptions:
              clampNum(
                revenuePayload.subscriptions ??
                  revenuePayload.subscription_total ??
                  0
              ) || 0,
            renewalRate:
              clampNum(
                revenuePayload.renewalRate ??
                  revenuePayload.renewal_rate ??
                  0
              ) || 0,
            currency,
          });

          setLineData(
            lineSeries.map((item) => ({
              ...item,
              name:
                item.name ||
                item.date ||
                item.day ||
                item.period ||
                "",
              value: clampNum(item.value ?? item.count ?? item.total ?? 0),
            }))
          );

          setBarData(
            barSeries.map((item) => ({
              ...item,
              name:
                item.name ||
                item.label ||
                item.quarter ||
                item.period ||
                "",
              value: clampNum(item.value ?? item.amount ?? item.total ?? 0),
            }))
          );
        } else {
          message.error("Failed to fetch analytics data");
        }

        let parentCount = 0;
        let studentCount = 0;

        if (overviewRes.status === "fulfilled") {
          const overviewData = overviewRes.value?.data ?? {};
          const overviewCounts =
            overviewData.overview ?? overviewData.counts ?? overviewData;
          parentCount = clampNum(
            overviewCounts.parents ??
              overviewCounts.parents_total ??
              0
          );
          studentCount = clampNum(
            overviewCounts.students ??
              overviewCounts.students_total ??
              0
          );
        }

        if (parentCount || studentCount) {
          setStats((prev) => ({
            ...prev,
            totalUsers: parentCount + studentCount,
          }));
        }

        if (
          subscriptionsRes.status === "fulfilled" ||
          invoicesRes.status === "fulfilled"
        ) {
          const subscriptions =
            subscriptionsRes.status === "fulfilled" &&
            Array.isArray(subscriptionsRes.value?.data)
              ? subscriptionsRes.value.data
              : [];
          const invoices =
            invoicesRes.status === "fulfilled" &&
            Array.isArray(invoicesRes.value?.data)
              ? invoicesRes.value.data
              : [];

          let subscriptionRevenue = 0;
          let activeSubscriptionRevenue = 0;
          let invoiceRevenue = 0;
          let activeCount = 0;
          const currencies = new Set();
          const subscriptionCurrencies = new Set();

          subscriptions.forEach((sub) => {
            const created =
              getFieldValue(sub, "createdAt") ??
              getFieldValue(sub, "created_at");
            if (created) {
              const createdAt = dayjs(created);
              if (
                createdAt.isBefore(dateRange.start) ||
                createdAt.isAfter(dateRange.end)
              ) {
                return;
              }
            }

            const { amount, currency } = extractSubscriptionAmount(sub);
            subscriptionRevenue += amount;
            if (currency) {
              currencies.add(currency);
              subscriptionCurrencies.add(currency);
            }
            if (pickStatus(sub) === "active") {
              activeSubscriptionRevenue += amount;
              activeCount += 1;
            }
          });

          invoices.forEach((invoice) => {
            const created =
              getFieldValue(invoice, "createdAt") ??
              getFieldValue(invoice, "created_at");
            if (created) {
              const createdAt = dayjs(created);
              if (
                createdAt.isBefore(dateRange.start) ||
                createdAt.isAfter(dateRange.end)
              ) {
                return;
              }
            }

            const cents =
              getFieldValue(invoice, "totalCents") ??
              getFieldValue(invoice, "total_cents") ??
              0;
            const currency =
              getFieldValue(invoice, "currency") ??
              getFieldValue(invoice, "currencyCode");

            invoiceRevenue += clampNum(cents) / 100;
            if (currency) {
              currencies.add(String(currency).toUpperCase());
            }
          });

          const currency =
            currencies.size === 1
              ? currencies.values().next().value
              : revenue.currency || "EUR";
          const subscriptionCurrency =
            subscriptionCurrencies.size === 1
              ? subscriptionCurrencies.values().next().value
              : currency;

          setRevenueBreakdown({
            subscriptionRevenue,
            activeSubscriptionRevenue,
            invoiceRevenue,
            totalRevenue: subscriptionRevenue + invoiceRevenue,
            activeCount,
            currency,
            subscriptionCurrency,
          });
        } else {
          setRevenueBreakdown((prev) => ({
            ...prev,
            subscriptionRevenue: 0,
            activeSubscriptionRevenue: 0,
            invoiceRevenue: 0,
            totalRevenue: 0,
            activeCount: 0,
          }));
        }
      } catch (error) {
        console.error("AnalyticsPage fetch error:", error);
        message.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter, dateRange]);

  const totalRevenueDisplay = formatCurrency(
    revenueBreakdown.totalRevenue,
    revenueBreakdown.currency
  );

  const activeSubsDisplay = `${formatNumber(revenueBreakdown.activeCount)} · ${formatCurrency(
    revenueBreakdown.activeSubscriptionRevenue,
    revenueBreakdown.subscriptionCurrency
  )}`;

  const renewalRateDisplay = `${clampNum(revenue.renewalRate).toFixed(1)}%`;
  const filterOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen dark:bg-gray-900 dark:text-white">
      <Title level={2}>📊 Analytics</Title>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Text type="secondary">Analyze platform usage and customer behavior.</Text>
        <Select
          value={filter}
          onChange={setFilter}
          options={filterOptions}
          style={{ width: 180 }}
          disabled={loading}
        />
      </div>

      <Tabs defaultActiveKey="1" className="mt-4">
        {/* 📈 General Usage */}
        <Tabs.TabPane tab="General Usage" key="1">
          <Divider orientation="left">Usage Overview</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard title="Total Users" value={stats.totalUsers} subtext="+5%" icon={<UserOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Active Users" value={stats.activeUsers} subtext="+3%" icon={<TeamOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="New Users" value={stats.newUsers} subtext="+10%" icon={<RiseOutlined />} />
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24} md={12}>
              <Card title="📈 User Growth">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="📊 Activity Trends">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#722ed1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* 😊 Customer Insights */}
        <Tabs.TabPane tab="Customer Insights" key="2">
          <Divider orientation="left">Customer Behavior</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard title="Satisfaction" value={insights.satisfaction} subtext="+2%" icon={<SmileOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Avg. Session (min)" value={insights.sessionDuration} subtext="+1m" icon={<ClockCircleOutlined />} />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Retention Rate" value={insights.retentionRate} icon={<ReloadOutlined />} />
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* 💰 Revenue */}
        <Tabs.TabPane tab="Revenue & Subscriptions" key="3">
          <Divider orientation="left">Revenue</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <StatCard
                title="Total Revenue"
                value={totalRevenueDisplay}
                subtext={`Invoices: ${formatCurrency(
                  revenueBreakdown.invoiceRevenue,
                  revenueBreakdown.currency
                )}`}
                icon={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} md={8}>
              <StatCard
                title="Subscriptions"
                value={formatCurrency(
                  revenueBreakdown.subscriptionRevenue,
                  revenueBreakdown.subscriptionCurrency
                )}
                subtext={`Active: ${activeSubsDisplay}`}
                icon={<Users />}
              />
            </Col>
            <Col xs={24} md={8}>
              <StatCard title="Renewal Rate" value={renewalRateDisplay} icon={<ReloadOutlined />} />
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>

      <div className="mt-8 text-right">
        <Space>
          <Button icon={<FilePdfOutlined />}>Export as PDF</Button>
          <Button type="primary" icon={<FileExcelOutlined />}>Export CSV</Button>
        </Space>
      </div>
    </div>
  );
}
