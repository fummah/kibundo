// src/pages/parent/billing/BillingOverview.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Divider,
  Tooltip,
  Empty,
} from "antd";
import {
  FileDoneOutlined,
  CreditCardOutlined,
  ReconciliationOutlined,
  GiftOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import DeviceFrame from "@/components/student/mobile/DeviceFrame";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { Title, Text } = Typography;

/* ---------- helpers ---------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const fmtDate = (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—");

/* ---------- dummy data ---------- */
const SUBSCRIPTION = {
  status: "Active",
  plan: "Monthly Family",
  interval: "month",
  children: 2,
  amount: 29.99,
  currency: "EUR",
  next_renewal: dayjs().add(14, "day").format("YYYY-MM-DD"),
  started_at: dayjs().subtract(3, "month").format("YYYY-MM-DD"),
};

const PAYMENT_METHODS = [
  { id: "pm_1", brand: "Visa", last4: "4242", exp: "08/27", default: true },
  { id: "pm_2", brand: "Mastercard", last4: "5454", exp: "03/28", default: false },
];

const INVOICES = [
  { id: 1, number: "INV-104", date: dayjs().subtract(2, "day").toISOString(), amount: 29.99, status: "Open", url: "#" },
  { id: 2, number: "INV-103", date: dayjs().subtract(1, "month").toISOString(), amount: 29.99, status: "Paid", url: "#" },
  { id: 3, number: "INV-102", date: dayjs().subtract(2, "month").toISOString(), amount: 29.99, status: "Paid", url: "#" },
  { id: 4, number: "INV-101", date: dayjs().subtract(3, "month").toISOString(), amount: 29.99, status: "Paid", url: "#" },
];

const COUPONS = [
  { code: "WELCOME20", desc: "20% off first month", active: true, expires: dayjs().add(10, "day").format("YYYY-MM-DD") },
];

export default function BillingOverview() {
  const navigate = useNavigate();

  const outstanding = useMemo(
    () =>
      INVOICES.filter((i) => i.status.toLowerCase() !== "paid").reduce(
        (s, i) => s + Number(i.amount || 0),
        0
      ),
    []
  );

  const paid30 = useMemo(
    () =>
      INVOICES.filter(
        (i) =>
          i.status.toLowerCase() === "paid" &&
          dayjs(i.date).isAfter(dayjs().subtract(30, "day"))
      ).length,
    []
  );

  const invoiceColumns = [
    {
      title: "Invoice #",
      dataIndex: "number",
      key: "number",
      render: (v) => <Text strong>{v}</Text>,
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (v) => fmtDate(v),
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v, r) => <Text>{money(v, r.currency || "EUR")}</Text>,
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => {
        const lower = String(s).toLowerCase();
        const color = lower === "paid" ? "green" : lower === "open" ? "gold" : "red";
        return <Tag color={color}>{s}</Tag>;
      },
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          aria-label={`Download ${r.number} PDF`}
          onClick={(e) => {
            e.preventDefault();
            // hook your real download here
          }}
        >
          PDF
        </Button>
      ),
      responsive: ["xs", "sm", "md", "lg", "xl"],
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
        {/* Scroll container (BottomTabBar must live inside) */}
        <main className="flex-1 overflow-y-auto px-5">
          {/* Single-column layout inside phone frame */}
          <div className="mx-auto w-full max-w-[520px] py-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <Title level={3} className="!mb-0">
                Billing Overview
              </Title>
              <Text type="secondary">
                Your plan, invoices, and payment methods at a glance.
              </Text>

              <Space wrap className="mt-2">
                <Button icon={<FileDoneOutlined />} onClick={() => navigate("/parent/billing/invoices")}>
                  View Invoices
                </Button>
                <Button icon={<ReconciliationOutlined />} onClick={() => navigate("/parent/billing/subscription")}>
                  Manage Subscription
                </Button>
                <Button icon={<GiftOutlined />} onClick={() => navigate("/parent/billing/coupons")}>
                  Coupons
                </Button>
              </Space>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Current Plan" value={SUBSCRIPTION.plan} />
                    <Tag color={SUBSCRIPTION.status === "Active" ? "green" : "default"}>
                      {SUBSCRIPTION.status}
                    </Tag>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {SUBSCRIPTION.children} {SUBSCRIPTION.children === 1 ? "child" : "children"} · Billed {SUBSCRIPTION.interval}
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Next Charge" value={money(SUBSCRIPTION.amount, SUBSCRIPTION.currency)} />
                    <ReconciliationOutlined className="text-gray-500 text-xl" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    On {fmtDate(SUBSCRIPTION.next_renewal)}
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Paid (30d)" value={paid30} />
                    <FileDoneOutlined className="text-gray-500 text-xl" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Invoices paid last 30 days</div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between">
                    <Statistic title="Outstanding" value={money(outstanding, "EUR")} />
                    <ExclamationCircleOutlined className="text-gray-500 text-xl" />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Amount due</div>
                </Card>
              </Col>
            </Row>

            {/* Invoices table */}
            <Card
              title={
                <Space>
                  <FileDoneOutlined />
                  <span>Recent Invoices</span>
                </Space>
              }
              className="shadow-sm rounded-2xl"
              extra={
                <Button
                  type="link"
                  onClick={() => navigate("/parent/billing/invoices")}
                  icon={<ArrowRightOutlined />}
                  aria-label="See all invoices"
                >
                  All invoices
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <Table
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No invoices yet"
                      />
                    ),
                  }}
                  rowKey="id"
                  columns={invoiceColumns}
                  dataSource={INVOICES}
                  pagination={{ pageSize: 5, hideOnSinglePage: true }}
                  size="middle"
                  scroll={{ x: 640 }}
                />
              </div>
            </Card>

            {/* Right column content becomes stacked cards on phone frame */}
            <div className="space-y-4">
              {/* Subscription summary */}
              <Card className="shadow-sm rounded-2xl">
                <Space className="w-full justify-between">
                  <Space>
                    <ReconciliationOutlined />
                    <Text strong>Subscription</Text>
                  </Space>
                  <Tag color={SUBSCRIPTION.status === "Active" ? "green" : "default"}>
                    {SUBSCRIPTION.status}
                  </Tag>
                </Space>

                <Divider className="my-3" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <Text type="secondary">Plan</Text>
                    <Text strong>{SUBSCRIPTION.plan}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Interval</Text>
                    <Text strong>{SUBSCRIPTION.interval}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Started</Text>
                    <Text>{fmtDate(SUBSCRIPTION.started_at)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Next renewal</Text>
                    <Text>{fmtDate(SUBSCRIPTION.next_renewal)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Amount</Text>
                    <Text strong>{money(SUBSCRIPTION.amount, SUBSCRIPTION.currency)}</Text>
                  </div>
                </div>

                <Button
                  block
                  className="mt-4"
                  type="primary"
                  onClick={() => navigate("/parent/billing/subscription")}
                >
                  Manage Subscription
                </Button>
              </Card>

              {/* Payment methods */}
              <Card className="shadow-sm rounded-2xl">
                <Space className="w-full justify-between">
                  <Space>
                    <CreditCardOutlined />
                    <Text strong>Payment Methods</Text>
                  </Space>
                </Space>

                <Divider className="my-3" />

                <List
                  itemLayout="horizontal"
                  dataSource={PAYMENT_METHODS}
                  locale={{ emptyText: "No payment methods yet" }}
                  renderItem={(m) => (
                    <List.Item
                      actions={[
                        <Tooltip
                          key="default"
                          title={m.default ? "Default method" : "Set as default"}
                        >
                          <Tag
                            onClick={() => {
                              // wire "set default" here
                            }}
                            className="cursor-pointer"
                            color={m.default ? "green" : "default"}
                            aria-label={m.default ? "Default payment method" : "Set as default"}
                          >
                            {m.default ? "Default" : "Set default"}
                          </Tag>
                        </Tooltip>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<CreditCardOutlined className="text-lg text-gray-500" />}
                        title={`${m.brand} •••• ${m.last4}`}
                        description={`Exp ${m.exp}`}
                      />
                    </List.Item>
                  )}
                />
                <Button
                  block
                  className="mt-2"
                  onClick={() => navigate("/parent/billing/payment-methods/add")}
                >
                  Add New Card
                </Button>
              </Card>

              {/* Coupons */}
              <Card className="shadow-sm rounded-2xl">
                <Space className="w-full justify-between">
                  <Space>
                    <GiftOutlined />
                    <Text strong>Coupons</Text>
                  </Space>
                  <Button
                    type="link"
                    onClick={() => navigate("/parent/billing/coupons")}
                    icon={<ArrowRightOutlined />}
                    aria-label="Manage coupons"
                  >
                    Manage
                  </Button>
                </Space>

                <Divider className="my-3" />

                <List
                  dataSource={COUPONS}
                  locale={{ emptyText: "No coupons" }}
                  renderItem={(c) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{c.code}</Text>
                            <Tag color={c.active ? "green" : "default"}>
                              {c.active ? "Active" : "Inactive"}
                            </Tag>
                          </Space>
                        }
                        description={
                          <span className="text-sm text-gray-600">
                            {c.desc} · Expires {fmtDate(c.expires)}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>

            {/* Space before bottom nav */}
            <ParentTabSpacer />
            <BottomTabBar />
          </div>
        </main>
      </div>
    </DeviceFrame>
  );
}
