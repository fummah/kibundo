// src/pages/admin/statistics/StatisticsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Statistic, Tabs, Table, Tag, Spin, message } from "antd";
import {
  Users as UsersIcon,
  CreditCard as SubIcon,
  CheckCircle as ActiveIcon,
  XCircle as ExpiredIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ------- CONFIG -------
const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "/api"; // e.g. http://localhost:5000/api
const TOKEN_GETTER = () => localStorage.getItem("token"); // adjust if your token key differs

// ------- UTILS -------
const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatDay = (d) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const withinDays = (date, days) => {
  const d = safeDate(date);
  if (!d) return false;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return d >= cutoff && d <= now;
};

const pickCreatedAt = (obj) =>
  safeDate(obj?.createdAt) ||
  safeDate(obj?.created_on) ||
  safeDate(obj?.created_at) ||
  safeDate(obj?.date) ||
  null;

const pickStatus = (sub) => {
  // Normalize subscription status -> "active" | "expired" | "pending" | "canceled" | "unknown"
  const now = new Date();
  const status = String(sub?.status || "").toLowerCase();
  const activeFlag = sub?.active === true;
  const start = safeDate(sub?.startDate || sub?.start_date);
  const end = safeDate(sub?.endDate || sub?.end_date);

  if (status) {
    if (["active", "trialing"].includes(status)) return "active";
    if (["expired"].includes(status)) return "expired";
    if (["canceled", "cancelled"].includes(status)) return "canceled";
    if (["pending", "unpaid", "incomplete"].includes(status)) return "pending";
  }
  if (activeFlag) return "active";
  if (end && end < now) return "expired";
  if (start && start > now) return "pending";
  return "unknown";
};

const aggregateByDay = (items, createdAtPicker = pickCreatedAt, windowDays = 90) => {
  // Build a date map over the window to make the chart continuous
  const now = new Date();
  const map = new Map();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    map.set(formatDay(d), 0);
  }
  items.forEach((it) => {
    const d = createdAtPicker(it);
    if (!d) return;
    const key = formatDay(d);
    if (map.has(key)) map.set(key, map.get(key) + 1);
  });
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
};

// ------- DATA FETCH -------
async function apiGet(path) {
  const token = TOKEN_GETTER();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

export default function StatisticsDashboard() {
  const [activeTab, setActiveTab] = useState("30"); // 7 | 30 | 90
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState(null);

  const windowDays = Number(activeTab); // convert "30" -> 30

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // IMPORTANT: uses your APIs (no dummy data)
        const [usersData, subsData] = await Promise.all([
          apiGet("/users"), // router.get("/users", verifyToken, getAllUsers);
          apiGet("/subscriptions"), // router.get("/subscriptions", verifyToken, getAllSubscriptions);
        ]);
        if (!mounted) return;

        // Some APIs return {data: []}, some return [] directly — normalize
        setUsers(Array.isArray(usersData) ? usersData : usersData?.data || []);
        setSubs(Array.isArray(subsData) ? subsData : subsData?.data || []);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError(e.message);
          message.error("Failed to load statistics. Check API base URL and token.");
        }
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []); // initial load

  // ------- METRICS -------
  const totalUsers = users.length;

  const usersInWindow = useMemo(
    () => users.filter((u) => withinDays(pickCreatedAt(u), windowDays)),
    [users, windowDays]
  );
  const newUsersCount = usersInWindow.length;

  const totalSubs = subs.length;

  const subStatusCounts = useMemo(() => {
    const counts = { active: 0, expired: 0, pending: 0, canceled: 0, unknown: 0 };
    subs.forEach((s) => {
      const st = pickStatus(s);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [subs]);

  const subsInWindow = useMemo(
    () => subs.filter((s) => withinDays(pickCreatedAt(s), windowDays)),
    [subs, windowDays]
  );
  const newSubsCount = subsInWindow.length;

  // Charts
  const usersSeries = useMemo(() => aggregateByDay(users, pickCreatedAt, windowDays), [users, windowDays]);
  const subsSeries = useMemo(() => aggregateByDay(subs, pickCreatedAt, windowDays), [subs, windowDays]);

  // Tables
const usersColumns = [
  {
    title: "Name",
    key: "name",
    render: (_, r) => {
      const first = r.first_name || "";
      const last = r.last_name || "";
      return (first + " " + last).trim() || "—";
    },
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email",
    render: (v) => v || "—",
  },
  {
    title: "Created",
    key: "created",
    render: (_, r) => {
      const d = pickCreatedAt(r);
      return d ? d.toLocaleString() : "—";
    },
  },
];


  const subsColumns = [
  {
    title: "User",
    key: "user",
    render: (_, r) => {
      const first = r.user?.first_name || "";
      const last = r.user?.last_name || "";
      const fullName = (first + " " + last).trim();
      const email = r.user?.email || r.userEmail || r.customerEmail || "—";
      return fullName ? `${fullName} (${email})` : email;
    },
  },
  {
    title: "Plan",
    dataIndex: "plan",
    key: "plan",
    render: (v, r) => v || r.planName || r.tier || "—",
  },
  {
    title: "Status",
    key: "status",
    render: (_, r) => {
      const s = pickStatus(r);
      const color =
        s === "active"
          ? "green"
          : s === "expired"
          ? "red"
          : s === "pending"
          ? "gold"
          : s === "canceled"
          ? "volcano"
          : "default";
      return <Tag color={color}>{s?.toUpperCase?.() || "—"}</Tag>;
    },
  },
  {
    title: "Start",
    key: "start",
    render: (_, r) => {
      const d = safeDate(r.startDate || r.start_date);
      return d ? d.toLocaleDateString() : "—";
    },
  },
  {
    title: "End",
    key: "end",
    render: (_, r) => {
      const d = safeDate(r.endDate || r.end_date);
      return d ? d.toLocaleDateString() : "—";
    },
  },
  {
    title: "Created",
    key: "created",
    render: (_, r) => {
      const d = pickCreatedAt(r);
      return d ? d.toLocaleString() : "—";
    },
  },
];

  return (
    <div className="p-4 md:p-6">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: "7", label: "Last 7 days" },
              { key: "30", label: "Last 30 days" },
              { key: "90", label: "Last 90 days" },
            ]}
          />
        </Col>

        {/* KPI CARDS */}
        <Col xs={24} md={6}>
          <Card className="rounded-2xl shadow">
            <div className="flex items-center gap-3">
              <UsersIcon size={20} />
              <Statistic title="Total Users" value={totalUsers} />
            </div>
            <div className="text-xs text-gray-500 mt-2">New in window: {newUsersCount}</div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="rounded-2xl shadow">
            <div className="flex items-center gap-3">
              <SubIcon size={20} />
              <Statistic title="Total Subscriptions" value={totalSubs} />
            </div>
            <div className="text-xs text-gray-500 mt-2">New in window: {newSubsCount}</div>
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card className="rounded-2xl shadow">
            <div className="flex items-center gap-3">
              <ActiveIcon size={20} />
              <Statistic title="Active Subs" value={subStatusCounts.active || 0} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card className="rounded-2xl shadow">
            <div className="flex items-center gap-3">
              <ExpiredIcon size={20} />
              <Statistic title="Expired Subs" value={subStatusCounts.expired || 0} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={4}>
          <Card className="rounded-2xl shadow">
            <div className="flex items-center gap-3">
              <Statistic title="Other Subs" value={(subStatusCounts.pending || 0) + (subStatusCounts.canceled || 0) + (subStatusCounts.unknown || 0)} />
            </div>
          </Card>
        </Col>

        {/* CHARTS */}
        <Col xs={24} md={12}>
          <Card title="New Users" className="rounded-2xl shadow" bodyStyle={{ height: 320 }}>
            {loading ? (
              <div className="flex justify-center items-center h-72">
                <Spin />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usersSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#usersGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="New Subscriptions" className="rounded-2xl shadow" bodyStyle={{ height: 320 }}>
            {loading ? (
              <div className="flex justify-center items-center h-72">
                <Spin />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={subsSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#82ca9d" fillOpacity={1} fill="url(#subsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* TABLES */}
        <Col span={24}>
          <Card title="Recent Users" className="rounded-2xl shadow">
            <Table
              rowKey={(r) => r.id || r._id || r.email || r.name}
              dataSource={users
                .filter((u) => withinDays(pickCreatedAt(u), windowDays))
                .sort((a, b) => (pickCreatedAt(b)?.getTime() || 0) - (pickCreatedAt(a)?.getTime() || 0))
                .slice(0, 20)}
              columns={usersColumns}
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Recent Subscriptions" className="rounded-2xl shadow">
            <Table
              rowKey={(r) => r.id || r._id || r.subscriptionId}
              dataSource={subs
                .filter((s) => withinDays(pickCreatedAt(s), windowDays))
                .sort((a, b) => (pickCreatedAt(b)?.getTime() || 0) - (pickCreatedAt(a)?.getTime() || 0))
                .slice(0, 20)}
              columns={subsColumns}
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {error && (
          <Col span={24}>
            <Card className="rounded-2xl border-red-200">
              <div className="text-red-600 font-medium">Error: {error}</div>
              <div className="text-xs text-gray-500 mt-2">
                Check that:
                <ul className="list-disc ml-6 mt-1">
                  <li>Backend is running and exposes <code>GET /users</code> and <code>GET /subscriptions</code>.</li>
                  <li><code>VITE_API_BASE_URL</code> is correct or remove it to use <code>/api</code> proxy.</li>
                  <li>A valid <code>token</code> exists in <code>localStorage</code> (Bearer auth).</li>
                </ul>
              </div>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
