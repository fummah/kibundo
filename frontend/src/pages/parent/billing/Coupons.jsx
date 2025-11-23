// src/pages/parent/billing/Coupons.jsx
import { useMemo, useState, useEffect } from "react";
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
  Spin,
} from "antd";
import {
  GiftOutlined,
  SearchOutlined,
  CopyOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  LinkOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import api from "@/api/axios";

// ParentShell is now handled at route level
import PlainBackground from "@/components/layouts/PlainBackground";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";
import { NUNITO_FONT_STACK } from "@/constants/fonts";

const { Title, Text } = Typography;

/* ---------------- helpers ---------------- */
const money = (v, currency = "EUR") => {
  // Ensure currency is always a valid string, default to EUR
  const validCurrency = currency && typeof currency === 'string' ? currency : "EUR";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: validCurrency,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
};

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
  // If coupon is marked as invalid in backend, mark as expired
  if (c.valid === false) return "expired";
  if (c.used) return "used";
  if (c.start_at && now().isBefore(dayjs(c.start_at))) return "upcoming";
  if (c.end_at && now().isAfter(dayjs(c.end_at).endOf("day"))) return "expired";
  // If coupon is valid and within date range, it's active
  if (c.valid === true || c.valid === undefined) return "active";
  return "active";
};

/* very light analytics helper (no-op if not available) */
const track = (name, props = {}) => {
  try {
    window?.analytics?.track?.(name, props);
  } catch {}
};

// Helper function to transform backend coupon to frontend format
const transformCoupon = (backendCoupon) => {
  const metadata = backendCoupon.metadata || {};
  const isPercent = !!backendCoupon.percent_off;
  const value = isPercent 
    ? parseFloat(backendCoupon.percent_off) 
    : (backendCoupon.amount_off_cents ? backendCoupon.amount_off_cents / 100 : 0);
  
  // Ensure currency is always a valid string, default to EUR
  const currency = backendCoupon.currency || "EUR";
  
  return {
    id: backendCoupon.id,
    code: backendCoupon.name || `COUPON-${backendCoupon.id}`,
    title: metadata.title || backendCoupon.name || "Special Offer",
    description: metadata.description || `${isPercent ? value + "%" : money(value, currency)} off your subscription`,
    type: isPercent ? "percent" : "fixed",
    value: value,
    currency: currency,
    start_at: metadata.start_at || backendCoupon.created_at || dayjs().subtract(1, "day").toISOString(),
    end_at: metadata.end_at || metadata.expires_at || dayjs().add(90, "day").toISOString(),
    min_spend: metadata.min_spend || 0,
    used: false, // TODO: Track if user has used this coupon
    valid: backendCoupon.valid !== false, // Backend valid field
  };
};

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
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [hasActiveCoupon, setHasActiveCoupon] = useState(false);

  // Fetch coupons and subscription status
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch coupons
      const couponsRes = await api.get("/coupons");
      const backendCoupons = Array.isArray(couponsRes.data) ? couponsRes.data : [];
      
      // Transform backend coupons to frontend format
      const transformed = backendCoupons
        .filter(c => c.valid !== false) // Only show valid coupons
        .map(transformCoupon);
      
      setCoupons(transformed);

      // Check if user has active subscription
      try {
        const userRes = await api.get("/current-user");
        const userId = userRes.data?.id;
        
        if (userId) {
          const parentRes = await api.get("/parents", { params: { user_id: userId } });
          const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
          const parent = parents.find(p => p.user_id === userId) || parents[0];
          
          if (parent?.id) {
            const parentDetailRes = await api.get(`/parent/${parent.id}`);
            const parentData = parentDetailRes.data?.data || parentDetailRes.data || parent;
            const subs = Array.isArray(parentData.subscription) ? parentData.subscription : [];
            const activeSub = subs.find(s => s.status === "active" || s.status === "Active");
            setHasActiveSub(!!activeSub);
          }
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
        // Continue without subscription check
      }

    } catch (err) {
      console.error("Failed to load coupons:", err);
      message.error("Failed to load coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refresh = () => {
    fetchData();
    message.success(t("parent.billing.coupons.refreshed"));
    track("coupon_list_refreshed");
  };

  const decorated = useMemo(
    () =>
      coupons.map((c) => ({
        ...c,
        code: String(c.code || "").toUpperCase(),
        status: deriveStatus(c),
      })),
    [coupons]
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
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10 pb-24">
          <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  className="!p-0 !h-auto text-neutral-600"
                  aria-label={t("common.back")}
                  onClick={() => navigate("/parent/settings")}
                />
                <div>
                  <Title level={3} className="!mb-0">
                    {t("parent.billing.coupons.title")}
                  </Title>
                  <Text type="secondary">{t("parent.billing.coupons.subtitle")}</Text>
                </div>
              </div>
              <Button icon={<ReloadOutlined />} onClick={refresh} aria-label="Refresh coupons">
                {t("actions.refresh")}
              </Button>
            </div>

            <Space direction="vertical" className="w-full">
              <Alert type="info" showIcon message={t("parent.billing.coupons.rules.oneActiveOnly")} />
              <Alert type="warning" showIcon message={t("parent.billing.coupons.activeSubNoDiscount")} />
            </Space>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Card className="rounded-2xl shadow-sm text-center" loading={loading}>
                  <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.active")}</div>
                  <div className="text-xl font-extrabold text-green-600">{kpis.actives}</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="rounded-2xl shadow-sm text-center" loading={loading}>
                  <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.upcoming")}</div>
                  <div className="text-xl font-extrabold text-blue-600">{kpis.upcoming}</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="rounded-2xl shadow-sm text-center" loading={loading}>
                  <div className="text-gray-500 text-xs">{t("parent.billing.coupons.kpi.expired")}</div>
                  <div className="text-xl font-extrabold text-red-500">{kpis.expired}</div>
                </Card>
              </Col>
            </Row>

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

            <Card className="rounded-2xl shadow-sm" loading={loading}>
              {loading ? (
                <div className="py-8 text-center">
                  <Spin size="large" />
                </div>
              ) : filtered.length === 0 ? (
                <Empty description={t("parent.billing.coupons.empty")} />
              ) : (
                <List
                  dataSource={filtered}
                  renderItem={(c) => (
                    <Card className="rounded-2xl shadow-sm mb-3" key={c.id}>
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFEFD2] text-[#FF7F32]">
                          <GiftOutlined />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{c.title}</span>
                            {statusTag(c.status)}
                            {c.min_spend > 0 && (
                              <Tag color="purple">
                                {t("parent.billing.coupons.minSpend", {
                                  amount: money(c.min_spend, c.currency),
                                })}
                              </Tag>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{c.description}</div>

                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <Badge color="#C7D425" text={<strong>{c.code}</strong>} />
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
            </Card>

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
                        <div className="text-sm text-gray-600">{o.description}</div>
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
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </PlainBackground>
  );
}
