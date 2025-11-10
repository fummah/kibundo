import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  Space, 
  Typography, 
  Tabs, 
  Select,
  message,
  Table,
  Tag,
  Spin,
  DatePicker
} from "antd";
import {
  Users as UsersIcon,
  CreditCard as SubIcon,
  CheckCircle as ActiveIcon,
  XCircle as ExpiredIcon,
  Clock as PendingIcon,
  RefreshCw as RefreshIcon,
  UserPlus as NewUsersIcon,
  BarChart2 as BarChartIcon,
  Download as DownloadIcon,
  TrendingUp,
  XCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import api from "@/api/axios";
import { useAuth } from "@/hooks/useAuth";

dayjs.extend(customParseFormat);
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Utility functions
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

const aggregateByDay = (items, dateField = "createdAt", startDate, endDate) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const start = startDate ? dayjs(startDate).startOf("day") : dayjs().subtract(29, "day");
  const end = endDate ? dayjs(endDate).endOf("day") : dayjs();

  const days = Math.max(end.diff(start, "day"), 0);
  const map = new Map();

  for (let i = 0; i <= days; i += 1) {
    const d = start.add(i, "day");
    const key = d.format("YYYY-MM-DD");
    map.set(key, { date: key, count: 0 });
  }

  items.forEach((item) => {
    const rawDate = getFieldValue(item, dateField);
    if (!rawDate) return;
    const d = dayjs(rawDate);
    if (!d.isValid()) return;
    if (d.isBefore(start) || d.isAfter(end)) return;
    const key = d.format("YYYY-MM-DD");
    if (map.has(key)) {
      map.get(key).count += 1;
    }
  });

  return Array.from(map.values());
};

const pickStatus = (sub) => {
  const status = String(sub?.status || '').toLowerCase();
  if (['active', 'trialing'].includes(status)) return 'active';
  if (['expired'].includes(status)) return 'expired';
  if (['canceled', 'cancelled'].includes(status)) return 'canceled';
  if (['pending', 'unpaid', 'incomplete'].includes(status)) return 'pending';
  return 'unknown';
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const extractSubscriptionAmount = (subscription) => {
  if (!subscription) {
    return { amount: 0, currency: "EUR" };
  }

  let currency =
    subscription.currency ||
    subscription.product?.currency ||
    subscription.raw?.subscription?.items?.data?.[0]?.price?.currency ||
    subscription.raw?.checkout_session?.currency ||
    "EUR";

  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  let raw = subscription.raw;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  let amount =
    subscription.amount ??
    subscription.total ??
    subscription.total_amount ??
    subscription.product?.price ??
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
  } else if (subscription.product?.price) {
    amount = subscription.product.price;
  }

  return {
    amount: safeNumber(amount),
    currency: currency ? String(currency).toUpperCase() : "EUR",
  };
};

const StatusTag = ({ status }) => {
  const statusMap = {
    active: { color: 'green', icon: <ActiveIcon size={14} />, label: 'Active' },
    expired: { color: 'red', icon: <ExpiredIcon size={14} />, label: 'Expired' },
    pending: { color: 'blue', icon: <PendingIcon size={14} />, label: 'Pending' },
    canceled: { color: 'orange', icon: <XCircle size={14} />, label: 'Canceled' },
    unknown: { color: 'gray', icon: <ClockCircleOutlined />, label: 'Unknown' }
  };

  const { color, icon, label } = statusMap[status] || statusMap.unknown;

  return (
    <Tag color={color} className="flex items-center gap-1">
      {icon}
      {label}
    </Tag>
  );
};

const fetchUsers = async ({ queryKey }) => {
  const [_, { startDate, endDate }] = queryKey;
  const { data } = await api.get('/users', {
    params: { startDate, endDate }
  });
  return data || [];
};

const fetchSubscriptions = async ({ queryKey }) => {
  const [_, { startDate, endDate }] = queryKey;
  const { data } = await api.get('/subscriptions', {
    params: { startDate, endDate }
  });
  return data || [];
};

const fetchInvoices = async ({ queryKey }) => {
  const [_, { startDate, endDate }] = queryKey;
  const { data } = await api.get('/invoices', {
    params: { startDate, endDate }
  });
  return data || [];
};

const formatCurrency = (value, currency = "EUR") =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export default function StatisticsDashboard() {
  const { token } = useAuth();
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const queryParams = useMemo(() => ({
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
  }), [dateRange]);

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: fetchUsers,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: subscriptions = [],
    isLoading: isLoadingSubs,
    isError: isSubsError,
    error: subsError,
    refetch: refetchSubs
  } = useQuery({
    queryKey: ['subscriptions', queryParams],
    queryFn: fetchSubscriptions,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

const {
  data: invoices = [],
  isLoading: isLoadingInvoices,
  isError: isInvoicesError,
  error: invoicesError,
  refetch: refetchInvoices,
} = useQuery({
  queryKey: ['invoices', queryParams],
  queryFn: fetchInvoices,
  enabled: !!token,
  staleTime: 5 * 60 * 1000,
});

const isLoading = isLoadingUsers || isLoadingSubs || isLoadingInvoices;
const isError = isUsersError || isSubsError || isInvoicesError;
const error = usersError || subsError || invoicesError;

  const { totalUsers, newUsersCount, usersByDay } = useMemo(() => {
    const start = dateRange[0]?.startOf('day');
    const end = dateRange[1]?.endOf('day');

    const usersInRange = users.filter((user) => {
      const created = getFieldValue(user, "createdAt");
      if (!created || !start || !end) return false;
      const createdAt = dayjs(created);
      return createdAt.isValid() && !createdAt.isBefore(start) && !createdAt.isAfter(end);
    });

    const byDay = aggregateByDay(usersInRange, "createdAt", start, end);

    return {
      totalUsers: usersInRange.length,
      newUsersCount: usersInRange.length,
      usersByDay: byDay
    };
  }, [users, dateRange]);

  const { 
    totalSubs, 
    activeSubs, 
    expiredSubs, 
    pendingSubs,
    canceledSubs,
    statusDistribution,
    subsByDay,
  subscriptionRevenue,
  activeSubscriptionRevenue,
  invoiceRevenue,
  totalRevenue,
  revenueCurrency,
  subscriptionCurrency
  } = useMemo(() => {
    const start = dateRange[0]?.startOf('day');
    const end = dateRange[1]?.endOf('day');
    const counts = { active: 0, expired: 0, pending: 0, canceled: 0, unknown: 0 };
    const subsInRange = subscriptions.filter((subscription) => {
      const created = getFieldValue(subscription, "createdAt");
      if (!created || !start || !end) return false;
      const createdAt = dayjs(created);
      return createdAt.isValid() && !createdAt.isBefore(start) && !createdAt.isAfter(end);
    });

    const filteredSubs = statusFilter.length > 0 
      ? subsInRange.filter(s => statusFilter.includes(pickStatus(s)))
      : subsInRange;

  let subscriptionRevenue = 0;
  let activeSubscriptionRevenue = 0;
  let invoiceRevenue = 0;
    const currencies = new Set();
  const subscriptionCurrencies = new Set();

    filteredSubs.forEach(s => {
      const status = pickStatus(s);
      counts[status] = (counts[status] || 0) + 1;
      const { amount, currency } = extractSubscriptionAmount(s);
    subscriptionRevenue += amount;
    if (status === 'active') {
      activeSubscriptionRevenue += amount;
    }
      if (currency) {
        currencies.add(currency);
      subscriptionCurrencies.add(currency);
      }
    });
    
    const byDay = aggregateByDay(filteredSubs, 'createdAt', start, end);
  const invoicesInRange = invoices.filter((invoice) => {
    const created = getFieldValue(invoice, "createdAt") ?? getFieldValue(invoice, "created_at");
    if (!created || !start || !end) return false;
    const createdAt = dayjs(created);
    return createdAt.isValid() && !createdAt.isBefore(start) && !createdAt.isAfter(end);
  });

  invoicesInRange.forEach((invoice) => {
    const cents =
      getFieldValue(invoice, "totalCents") ??
      getFieldValue(invoice, "total_cents") ??
      0;
    const currency =
      getFieldValue(invoice, "currency") ||
      getFieldValue(invoice, "currencyCode");
    invoiceRevenue += Number(cents || 0) / 100;
    if (currency) {
      currencies.add(String(currency).toUpperCase());
    }
  });

  const revenueCurrency = currencies.size === 1 ? currencies.values().next().value : 'EUR';
  const subscriptionCurrency = subscriptionCurrencies.size === 1
    ? subscriptionCurrencies.values().next().value
    : revenueCurrency;
  const totalRevenue = subscriptionRevenue + invoiceRevenue;

    return {
      totalSubs: filteredSubs.length,
      activeSubs: counts.active,
      expiredSubs: counts.expired,
      pendingSubs: counts.pending,
      canceledSubs: counts.canceled,
      statusDistribution: Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        color: COLORS[Object.keys(counts).indexOf(name) % COLORS.length]
      })),
      subsByDay: byDay,
    subscriptionRevenue,
    activeSubscriptionRevenue,
    invoiceRevenue,
    totalRevenue,
    revenueCurrency,
    subscriptionCurrency
    };
}, [subscriptions, invoices, statusFilter, dateRange]);

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
    }
  };

  const handleRefresh = async () => {
    try {
    await Promise.all([refetchUsers(), refetchSubs(), refetchInvoices()]);
      message.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      message.error('Failed to refresh data');
    }
  };

  const handleExport = () => {
    message.info('Export functionality will be implemented here');
  };

  const renderOverviewTab = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full hover:shadow-lg transition-shadow duration-300">
          <Statistic
            title="Total Users"
            value={totalUsers}
            prefix={<UsersIcon className="text-blue-500" />}
          />
          <div className="mt-2 text-sm text-gray-500">
            <NewUsersIcon className="inline mr-1" size={14} />
            {newUsersCount} new this period
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full hover:shadow-lg transition-shadow duration-300">
          <Statistic
            title="Active Subscriptions"
            value={activeSubs}
            prefix={<ActiveIcon className="text-green-500" />}
          />
          <div className="mt-2 text-sm text-gray-500">
            {((activeSubs / Math.max(totalSubs, 1)) * 100).toFixed(1)}% of total
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Total: {formatCurrency(activeSubscriptionRevenue, subscriptionCurrency || revenueCurrency || 'EUR')}
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full hover:shadow-lg transition-shadow duration-300">
          <Statistic
            title="Revenue"
            value={totalRevenue}
            precision={2}
            formatter={(value) => formatCurrency(value, revenueCurrency || 'EUR')}
          />
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <TrendingUp className="text-green-500 mr-1" size={14} />
            <span>12% from last period</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div>Subscriptions: {formatCurrency(subscriptionRevenue, revenueCurrency || 'EUR')}</div>
            <div>Invoices: {formatCurrency(invoiceRevenue, revenueCurrency || 'EUR')}</div>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full hover:shadow-lg transition-shadow duration-300">
          <Statistic
            title="Avg. Session"
            value="2.7"
            suffix="min"
          />
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-green-500">↑ 12%</span> from last month
          </div>
        </Card>
      </Col>
      
      <Col span={24} lg={16}>
        <Card 
          title="User Activity" 
          className="h-full"
          extra={
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              onChange={setStatusFilter}
              mode="multiple"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'expired', label: 'Expired' },
                { value: 'pending', label: 'Pending' },
                { value: 'canceled', label: 'Canceled' }
              ]}
            />
          }
        >
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usersByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Users" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.1} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
      
      <Col span={24} lg={8}>
        <Card title="Subscription Status" className="h-full hover:shadow-lg transition-shadow duration-300">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
    </Row>
  );

  const renderUsersTab = () => (
    <Card>
      <Table
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'User',
            dataIndex: 'email',
            key: 'email',
            render: (email, record) => (
              <div>
                <div className="font-medium">{record.name || email}</div>
                <div className="text-gray-500 text-sm">{email}</div>
              </div>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <StatusTag status={status} />
          },
          {
            title: 'Joined',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => dayjs(date).format('MMM D, YYYY')
          }
        ]}
      />
    </Card>
  );

  const renderSubscriptionsTab = () => (
    <Card>
      <Table
        dataSource={subscriptions}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            render: (id) => <Text copyable>{id.slice(0, 8)}</Text>
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <StatusTag status={status} />
          },
          {
            title: 'Plan',
            dataIndex: ['plan', 'name'],
            key: 'plan'
          },
          {
            title: 'User',
            dataIndex: ['user', 'email'],
            key: 'user'
          },
          {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date) => dayjs(date).format('MMM D, YYYY')
          },
          {
            title: 'End Date',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '-'
          }
        ]}
      />
    </Card>
  );

  if (isLoading && !users.length && !subscriptions.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title level={2} className="!mb-1">Statistics Dashboard</Title>
          <Text type="secondary">
            {dateRange[0].format('MMM D, YYYY')} - {dateRange[1].format('MMM D, YYYY')}
          </Text>
        </div>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
          <Button
            icon={<RefreshIcon />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {isError && (
        <div className="mb-6">
          <Card className="border-red-100 bg-red-50">
            <div className="flex items-center gap-3 text-red-600">
              <CloseCircleOutlined />
              <div>
                <div className="font-medium">Failed to load data</div>
                <div className="text-sm">{error?.message || 'Unknown error occurred'}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
      {renderOverviewTab()}
    </div>
  );
}