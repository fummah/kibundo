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
  Tag,
  Typography,
  message,
  Alert,
  Tooltip,
} from "antd";
import {
  GiftOutlined,
  SearchOutlined,
  CopyOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  LinkOutlined,
  ArrowLeftOutlined, // ✅ added
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
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

const fmtDate = (v) => (v ? dayjs(v).format("MMM D, YYYY") : "—");

const discountLabel = (c) =>
  c.type === "percent" ? `${c.value}%` : `${money(c.value, c.currency)}`;

const statusTag = (s) => {
  const t = String(s).toLowerCase();
  if (t === "active") return <Tag color="green">Active</Tag>;
  if (t === "upcoming") return <Tag color="blue">Upcoming</Tag>;
  if (t === "expired") return <Tag color="red">Expired</Tag>;
  if (t === "used") return <Tag color="gold">Used</Tag>;
  return <Tag>—</Tag>;
};

const now = () => dayjs();

/* derive status from dates + used flag (end date inclusive through end of day) */
const deriveStatus = (c) => {
  if (c.used) return "used";
  if (c.start_at && now().isBefore(dayjs(c.start_at))) return "upcoming";
  if (c.end_at && now().isAfter(dayjs(c.end_at).endOf("day"))) return "expired";
  return "active";
};

/* very light analytics helper (no-op if not available) */
const track = (name, props = {}) => {
  try {
    window?.analytics?.track?.(name, props);
  } catch {}
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

/* ---------------- dummy external offers ---------------- */
const DUMMY_OFFERS = [
  {
    id: "o1",
    partnerId: "books-xy",
    title: "Save 10% at Partner XY",
    description: "Get 10% off when buying a children’s book.",
    url: "https://example.com/partner-xy",
    end_at: dayjs().add(45, "day").toISOString(),
  },
  {
    id: "o2",
    partnerId: "newspaper-summer",
    title: "Summer: 4 weeks newspaper free",
    description: "Try 4 weeks free — learning section included.",
    url: "https://example.com/summer-newspaper",
    end_at: dayjs().add(20, "day").toISOString(),
  },
];

/* ---------------- page ---------------- */
export default function Coupons() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [seg, setSeg] = useState("active"); // active | upcoming | expired | used | all

  // TODO: wire to your backend profile/subscription endpoints
  const hasActiveSub = false; // active subscriptions cannot be discounted
  const hasActiveCoupon = false; // only one active coupon at a time

  const refresh = () => {
    message.success(t("parent.billing.coupons.refreshed"));
    track("coupon_list_refreshed");
  };

  const decorated = useMemo(
    () =>
      DUMMY_COUPONS.map((c) => ({
        ...c,
        code: String(c.code || "").toUpperCase(),
        status: deriveStatus(c),
      })),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = decorated
      .filter((c) => (seg === "all" ? true : c.status === seg))
      .filter(
        (c) =>
          !q ||
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const order = { active: 0, upcoming: 1, used: 2, expired: 3 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
      });

    track("coupon_offers_viewed", { count: list.length, seg });
    return list;
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
      message.success(t("actions.copiedCode", { code }));
      track("coupon_code_copied", { code });
    } catch {
      message.warning(t("actions.copyFailed"));
    }
  };

  const canRedeem = (coupon) =>
    coupon.status === "active" && !hasActiveSub && !hasActiveCoupon;

  const blockedReason = (coupon) => {
    if (coupon.status !== "active") return t("parent.billing.coupons.errors.notActive");
    if (hasActiveCoupon) return t("parent.billing.coupons.errors.hasActiveCoupon");
    if (hasActiveSub) return t("parent.billing.coupons.activeSubNoDiscount");
    return "";
  };

  const useNow = (coupon) => {
    const code = coupon.code;

    if (!canRedeem(coupon)) {
      const reason = blockedReason(coupon);
      if (reason) message.warning(reason);
      track("coupon_redeem_blocked", { code, reason });
      return;
    }

    navigator.clipboard?.writeText(code);
    message.success(t("parent.billing.coupons.applyNavigating"));
    track("coupon_applied", { code, type: "internal" });

    navigate(`/parent/billing/subscription?code=${encodeURIComponent(code)}`);
  };

  return (
    <GradientShell>
      {/* Full-height scroll container */}
      <div
        className="w-full h-[100dvh] overflow-y-auto overscroll-y-contain touch-pan-y flex justify-center"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="main"
        aria-label={t("parent.billing.coupons.title")}
      >
        <div className="w-full max-w-[520px] px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] mx-auto space-y-6">
          
          {/* header with back + refresh */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* ✅ Back arrow */}
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                aria-label={t("common.back")}
              />
              <div>
                <Title level={2} className="!m-0">
                  {t("parent.billing.coupons.title")}
                </Title>
                <p className="text-gray-600 m-0">
                  {t("parent.billing.coupons.subtitle")}
                </p>
              </div>
            </div>

            <Button
              icon={<ReloadOutlined />}
              onClick={refresh}
              aria-label="Refresh coupons"
            >
              {t("actions.refresh")}
            </Button>
          </div>

          {/* rules */}
          <Space direction="vertical" className="w-full">
            <Alert
              type="info"
              showIcon
              message={t("parent.billing.coupons.rules.oneActiveOnly")}
            />
            <Alert
              type="warning"
              showIcon
              message={t("parent.billing.coupons.activeSubNoDiscount")}
            />
          </Space>

          {/* KPIs */}
          <Row gutter={[12, 12]}>
            <Col xs={8}>
              <Card className="rounded-2xl shadow-sm text-center">
                <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.active")}</div>
                <div className="text-xl font-extrabold text-green-600">{kpis.actives}</div>
              </Card>
            </Col>
            <Col xs={8}>
              <Card className="rounded-2xl shadow-sm text-center">
                <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.upcoming")}</div>
                <div className="text-xl font-extrabold text-blue-600">{kpis.upcoming}</div>
              </Card>
            </Col>
            <Col xs={8}>
              <Card className="rounded-2xl shadow-sm text-center">
                <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.expired")}</div>
                <div className="text-xl font-extrabold text-red-500">{kpis.expired}</div>
              </Card>
            </Col>
          </Row>

          {/* filters */}
          <Card className="rounded-2xl shadow-sm">
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder={t("parent.billing.coupons.searchPh")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="rounded-xl"
                  aria-label="Search coupons"
                />
              </Col>
              <Col xs={24}>
                <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                  <Segmented
                    options={[
                      { label: t("filters.active"), value: "active" },
                      { label: t("filters.upcoming"), value: "upcoming" },
                      { label: t("filters.expired"), value: "expired" },
                      { label: t("filters.used"), value: "used" },
                      { label: t("filters.all"), value: "all" },
                    ]}
                    value={seg}
                    onChange={setSeg}
                    size="large"
                    aria-label="Filter coupons by status"
                  />
                </div>
              </Col>
            </Row>
          </Card>

          {/* internal coupons list */}
          {filtered.length === 0 ? (
            <Card className="rounded-2xl shadow-sm">
              <Empty description={t("parent.billing.coupons.empty")} />
            </Card>
          ) : (
            <List
              dataSource={filtered}
              renderItem={(c) => (
                <Card className="rounded-2xl shadow-sm mb-3" key={c.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lime-200 grid place-items-center text-lime-800">
                      <GiftOutlined />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.title}</span>
                        {statusTag(c.status)}
                        {c.min_spend > 0 && (
                          <Tag color="purple" className="ml-1">
                            {t("parent.billing.coupons.minSpend", {
                              amount: money(c.min_spend, c.currency),
                            })}
                          </Tag>
                        )}
                      </div>
                      <div className="text-gray-600 text-sm">{c.description}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Badge color="#c7d425" text={<strong>{c.code}</strong>} />
                        <Tag color="magenta">
                          {discountLabel(c)} {t("parent.billing.coupons.off")}
                        </Tag>
                        <Text type="secondary" className="text-xs">
                          {dayjs(c.start_at).format("MMM D")} – {fmtDate(c.end_at)}
                        </Text>
                      </div>

                      <Space className="mt-3">
                        <Button onClick={() => copy(c.code)} icon={<CopyOutlined />} aria-label={`Copy ${c.code}`}>
                          {t("actions.copy")}
                        </Button>

                        <Tooltip title={!canRedeem(c) ? blockedReason(c) : ""}>
                          <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            disabled={!canRedeem(c)}
                            onClick={() => useNow(c)}
                            aria-label={`Use ${c.code}`}
                          >
                            {t("actions.useNow")}
                          </Button>
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </Card>
              )}
            />
          )}

          {/* External offers */}
          <Card className="rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <strong>{t("parent.billing.coupons.externalOffers.title")}</strong>
              <Tag>{t("parent.billing.coupons.externalOffers.tag")}</Tag>
            </div>
            {DUMMY_OFFERS.length === 0 ? (
              <Empty description={t("parent.billing.coupons.externalOffers.empty")} />
            ) : (
              <List
                dataSource={DUMMY_OFFERS}
                renderItem={(o) => (
                  <List.Item key={o.id} className="!px-0">
                    <div className="flex-1">
                      <div className="font-semibold">{o.title}</div>
                      <div className="text-gray-600 text-sm">{o.description}</div>
                      <Text type="secondary" className="text-xs">
                        {t("parent.billing.coupons.validUntil", {
                          date: fmtDate(o.end_at),
                        })}
                      </Text>
                    </div>
                    <Button
                      type="default"
                      icon={<LinkOutlined />}
                      onClick={() => {
                        track("coupon_applied", { type: "external", partnerId: o.partnerId });
                        window.open(o.url, "_blank", "noopener,noreferrer");
                      }}
                      aria-label={`Open offer: ${o.title}`}
                    >
                      {t("actions.getOffer")}
                    </Button>
                  </List.Item>
                )}
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
