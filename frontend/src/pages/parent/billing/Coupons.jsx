// src/pages/parent/billing/Coupons.jsx
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
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
  GiftOutlined,
  SearchOutlined,
  CopyOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";

const { Title, Text } = Typography;

/* ---------------- helpers ---------------- */
const money = (v, currency = "EUR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const discountLabel = (c) =>
  c.type === "percent" ? `${c.value}% off` : `${money(c.value, c.currency)} off`;

const statusTag = (s) => {
  const t = String(s).toLowerCase();
  if (t === "active") return <Tag color="green">Active</Tag>;
  if (t === "upcoming") return <Tag color="blue">Upcoming</Tag>;
  if (t === "expired") return <Tag color="red">Expired</Tag>;
  if (t === "used") return <Tag color="gold">Used</Tag>;
  return <Tag>—</Tag>;
};

const now = () => dayjs();

/* derive status from dates + used flag */
const deriveStatus = (c) => {
  if (c.used) return "used";
  if (c.start_at && now().isBefore(dayjs(c.start_at))) return "upcoming";
  if (c.end_at && now().isAfter(dayjs(c.end_at))) return "expired";
  return "active";
};

/* ---------------- dummy coupons ---------------- */
const DUMMY_COUPONS = [
  {
    id: "c1",
    code: "WELCOME20",
    title: "Welcome 20%",
    description: "New families get 20% off the first billing cycle.",
    type: "percent",
    value: 20,
    currency: "EUR",
    start_at: dayjs().subtract(15, "day").toISOString(),
    end_at: dayjs().add(30, "day").toISOString(),
    min_spend: 0,
    used: false,
  },
  {
    id: "c2",
    code: "SPRING10",
    title: "Spring Special",
    description: "€10 off on monthly or yearly plans.",
    type: "fixed",
    value: 10,
    currency: "EUR",
    start_at: dayjs().subtract(3, "day").toISOString(),
    end_at: dayjs().add(10, "day").toISOString(),
    min_spend: 19,
    used: false,
  },
  {
    id: "c3",
    code: "SUMMER25",
    title: "Summer Early Bird",
    description: "25% off yearly plans only.",
    type: "percent",
    value: 25,
    currency: "EUR",
    start_at: dayjs().add(7, "day").toISOString(),
    end_at: dayjs().add(60, "day").toISOString(),
    min_spend: 0,
    used: false,
  },
  {
    id: "c4",
    code: "PAST5",
    title: "Past Promo",
    description: "This one is over — for demo purposes.",
    type: "fixed",
    value: 5,
    currency: "EUR",
    start_at: dayjs().subtract(60, "day").toISOString(),
    end_at: dayjs().subtract(20, "day").toISOString(),
    min_spend: 0,
    used: false,
  },
  {
    id: "c5",
    code: "USED15",
    title: "Already Used",
    description: "You’ve redeemed this before (demo).",
    type: "percent",
    value: 15,
    currency: "EUR",
    start_at: dayjs().subtract(10, "day").toISOString(),
    end_at: dayjs().add(10, "day").toISOString(),
    min_spend: 0,
    used: true,
  },
];

/* ---------------- page ---------------- */
export default function Coupons() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [seg, setSeg] = useState("active"); // active | upcoming | expired | used | all

  const refresh = () => {
    message.success("Coupons refreshed");
  };

  const decorated = useMemo(
    () => DUMMY_COUPONS.map((c) => ({ ...c, status: deriveStatus(c) })),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decorated
      .filter((c) => (seg === "all" ? true : c.status === seg))
      .filter(
        (c) =>
          !q ||
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.status === "active" ? -1 : 1));
  }, [decorated, seg, query]);

  const kpis = useMemo(() => {
    const actives = decorated.filter((c) => c.status === "active").length;
    const upcoming = decorated.filter((c) => c.status === "upcoming").length;
    const expired = decorated.filter((c) => c.status === "expired").length;
    return { actives, upcoming, expired };
  }, [decorated]);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      message.success(`Copied code: ${code}`);
    } catch {
      message.warning("Could not copy code");
    }
  };

  const useNow = (code) => {
    const url = `/parent/billing/subscription?code=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(code);
    message.success(`Code copied. Opening Subscription…`);
    navigate(url);
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (v) => <Badge color="#c7d425" text={<strong>{v}</strong>} />,
    },
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "Discount",
      key: "disc",
      width: 140,
      render: (_, r) => <span className="font-semibold">{discountLabel(r)}</span>,
    },
    {
      title: "Validity",
      key: "validity",
      width: 220,
      render: (_, r) => (
        <span className="text-gray-600">
          {dayjs(r.start_at).format("MMM D, YYYY")} – {dayjs(r.end_at).format("MMM D, YYYY")}
        </span>
      ),
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
      width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copy(r.code)}>
            Copy
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<ArrowRightOutlined />}
            disabled={r.status !== "active"}
            onClick={() => useNow(r.code)}
          >
            Use now
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <GradientShell>
      {/* padding-bottom for mobile bottom tabs */}
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <Title level={2} className="!m-0">
              Coupons
            </Title>
            <p className="text-gray-600 m-0">
              Find and apply promo codes to save on your plan.
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            Refresh
          </Button>
        </div>

        {/* KPIs (responsive) */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm">
              <div className="text-gray-500 text-sm">Active</div>
              <div className="text-2xl font-extrabold text-green-600">
                {kpis.actives}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm">
              <div className="text-gray-500 text-sm">Upcoming</div>
              <div className="text-2xl font-extrabold text-blue-600">
                {kpis.upcoming}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm">
              <div className="text-gray-500 text-sm">Expired</div>
              <div className="text-2xl font-extrabold text-red-500">
                {kpis.expired}
              </div>
            </Card>
          </Col>
        </Row>

        {/* filters (stack on mobile; Segmented scrolls horizontally if tight) */}
        <Card className="rounded-2xl shadow-sm">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={12} lg={10}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search code, title, or description"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-xl"
              />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <div className="w-full overflow-x-auto">
                <Segmented
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Upcoming", value: "upcoming" },
                    { label: "Expired", value: "expired" },
                    { label: "Used", value: "used" },
                    { label: "All", value: "all" },
                  ]}
                  value={seg}
                  onChange={setSeg}
                  size="large"
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* mobile list */}
        <div className="mobile-only">
          {filtered.length === 0 ? (
            <Card className="rounded-2xl shadow-sm">
              <Empty description="No coupons match your filters." />
            </Card>
          ) : (
            <List
              dataSource={filtered}
              renderItem={(c) => (
                <Card className="rounded-2xl shadow-sm mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lime-200 grid place-items-center text-lime-800">
                      <GiftOutlined />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.title}</span>
                        {statusTag(c.status)}
                      </div>
                      <div className="text-gray-600 text-sm">{c.description}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Badge color="#c7d425" text={<strong>{c.code}</strong>} />
                        <Tag color="magenta">{discountLabel(c)}</Tag>
                        <Text type="secondary" className="text-xs">
                          {dayjs(c.start_at).format("MMM D")} –{" "}
                          {dayjs(c.end_at).format("MMM D, YYYY")}
                        </Text>
                      </div>

                      <Space className="mt-3">
                        <Button icon={<CopyOutlined />} onClick={() => copy(c.code)}>
                          Copy
                        </Button>
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          disabled={c.status !== "active"}
                          onClick={() => useNow(c.code)}
                        >
                          Use now
                        </Button>
                      </Space>
                    </div>
                  </div>
                </Card>
              )}
            />
          )}
        </div>

        {/* desktop table (scroll-x to stay responsive on narrow laptops) */}
        <div className="desktop-only">
          <Card className="rounded-2xl shadow-sm">
            {filtered.length === 0 ? (
              <Empty description="No coupons match your filters." />
            ) : (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                scroll={{ x: 920 }}
              />
            )}
          </Card>
        </div>
      </div>

      {/* mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
