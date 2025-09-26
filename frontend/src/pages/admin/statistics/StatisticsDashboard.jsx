import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  Spin, 
  message, 
  DatePicker,
  Space,
  Typography,
  Table,
  Tag,
  Tooltip,
  Tabs,
  Select
} from "antd";
import {
  Users as UsersIcon,
  CreditCard as SubIcon,
  CreditCard,  // Add this line
  CheckCircle as ActiveIcon,
  XCircle as ExpiredIcon,
  Clock as PendingIcon,
  RefreshCw as RefreshIcon,
  UserPlus as NewUsersIcon,
  TrendingUp as GrowthIcon,  // This is the existing import
  BarChart2 as BarChartIcon,
  PieChart as PieChartIcon,
  Download as DownloadIcon,
  Filter as FilterIcon,
  XCircle,
  TrendingUp  // Add this line
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import api from "@/api/axios";

dayjs.extend(customParseFormat);
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

// Utility functions
const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatDay = (d) => dayjs(d).format('YYYY-MM-DD');

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
  const now = new Date();
  const status = String(sub?.status || '').toLowerCase();
  const activeFlag = sub?.active === true;
  const start = safeDate(sub?.startDate || sub?.start_date);
  const end = safeDate(sub?.endDate || sub?.end_date);

  if (status) {
    if (['active', 'trialing'].includes(status)) return 'active';
    if (['expired'].includes(status)) return 'expired';
    if (['canceled', 'cancelled'].includes(status)) return 'canceled';
    if (['pending', 'unpaid', 'incomplete'].includes(status)) return 'pending';
  }
  if (activeFlag) return 'active';
  if (end && end < now) return 'expired';
  if (start && start > now) return 'pending';
  return 'unknown';
};

const aggregateByDay = (items, createdAtPicker = pickCreatedAt, windowDays = 90) => {
  const now = new Date();
  const map = new Map();
  
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    map.set(formatDay(d), { date: formatDay(d), count: 0 });
  }

  items.forEach((it) => {
    const d = createdAtPicker(it);
    if (!d) return;
    const key = formatDay(d);
    if (map.has(key)) {
      map.get(key).count += 1;
    }
  });

  return Array.from(map.values());
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatusTag = ({ status }) => {
  const statusMap = {
    active: { color: 'green', icon: <ActiveIcon size={14} />, label: 'Active' },
    expired: { color: 'red', icon: <ExpiredIcon size={14} />, label: 'Expired' },
    pending: { color: 'blue', icon: <PendingIcon size={14} />, label: 'Pending' },
    canceled: { color: 'orange', icon: <XCircle size={14} />, label: 'Canceled' }, // Updated this line
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

export default function StatisticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState([]);
  
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      const [startDate, endDate] = dateRange;
      
      const [usersRes, subsRes] = await Promise.all([
        api.get('/users', {
          params: {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD')
          }
        }),
        api.get('/subscriptions', {
          params: {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD')
          }
        })
      ]);

      setUsers(usersRes.data || []);
      setSubs(subsRes.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      message.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [token, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process data for charts and statistics
  const { totalUsers, newUsersCount, usersByDay } = useMemo(() => {
    const daysInRange = dateRange[1].diff(dateRange[0], 'day') + 1;
    const usersInWindow = users.filter(u => withinDays(pickCreatedAt(u), daysInRange));
    const usersByDay = aggregateByDay(users, pickCreatedAt, daysInRange);
    
    return {
      totalUsers: users.length,
      newUsersCount: usersInWindow.length,
      usersByDay
    };
  }, [users, dateRange]);

  const { 
    totalSubs, 
    activeSubs, 
    expiredSubs, 
    pendingSubs,
    canceledSubs,
    unknownSubs,
    subsByDay,
    statusDistribution 
  } = useMemo(() => {
    const counts = { active: 0, expired: 0, pending: 0, canceled: 0, unknown: 0 };
    subs.forEach(s => {
      const status = pickStatus(s);
      counts[status] = (counts[status] || 0) + 1;
    });
    
    const daysInRange = dateRange[1].diff(dateRange[0], 'day') + 1;
    const filteredSubs = statusFilter.length > 0 
      ? subs.filter(s => statusFilter.includes(pickStatus(s)))
      : subs;
    
    return {
      totalSubs: subs.length,
      activeSubs: counts.active,
      expiredSubs: counts.expired,
      pendingSubs: counts.pending,
      canceledSubs: counts.canceled,
      unknownSubs: counts.unknown,
      subsByDay: aggregateByDay(filteredSubs, pickCreatedAt, daysInRange),
      statusDistribution: Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        color: COLORS[Object.keys(counts).indexOf(name) % COLORS.length]
      }))
    };
  }, [subs, dateRange, statusFilter]);

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
    }
  };

  const handleStatusFilterChange = (values) => {
    setStatusFilter(values);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    // Implement export functionality
    message.info('Export functionality will be implemented here');
  };

  const renderOverviewTab = () => (
    <>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card className="rounded-2xl shadow h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <UsersIcon className="text-blue-500" size={20} />
              <Statistic 
                title="Total Users" 
                value={totalUsers} 
                loading={loading}
                prefix={<GrowthIcon size={16} className="text-green-500 mr-1" />}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <NewUsersIcon size={14} />
              <span>{newUsersCount} new in period</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="rounded-2xl shadow h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <SubIcon className="text-purple-500" size={20} />
              <Statistic 
                title="Total Subscriptions" 
                value={totalSubs} 
                loading={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
              <span className="text-green-500">
                <ActiveIcon size={12} className="inline mr-1" />
                {activeSubs} Active
              </span>
              <span className="text-red-500">
                <ExpiredIcon size={12} className="inline mr-1" />
                {expiredSubs} Expired
              </span>
              <span className="text-blue-500">
                <PendingIcon size={12} className="inline mr-1" />
                {pendingSubs} Pending
              </span>
              <span className="text-orange-500">
                <XCircle size={12} className="inline mr-1" />
                {canceledSubs} Canceled
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className="rounded-2xl shadow h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <BarChartIcon className="text-green-500" size={20} />
              <Statistic 
                title="Active Rate" 
                value={`${Math.round((activeSubs / Math.max(totalSubs, 1)) * 100)}%`} 
                loading={loading}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {activeSubs} out of {totalSubs} subscriptions
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
  <Card className="rounded-2xl shadow h-full hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <TrendingUp className="text-yellow-500" size={20} />
      <Statistic 
        title="Avg. Daily Signups" 
        value={Math.round(newUsersCount / Math.max(dateRange[1].diff(dateRange[0], 'day') + 1, 1))} 
        loading={loading}
      />
    </div>
    <div className="text-xs text-gray-500 mt-2">
      Over {dateRange[1].diff(dateRange[0], 'day') + 1} days
    </div>
  </Card>
</Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card 
            title="User Activity" 
            className="rounded-2xl shadow h-full"
            loading={loading}
            extra={
              <div className="flex items-center gap-2">
                <Select
                  mode="multiple"
                  placeholder="Filter by status"
                  style={{ width: 200 }}
                  onChange={handleStatusFilterChange}
                  value={statusFilter}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'expired', label: 'Expired' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'canceled', label: 'Canceled' }
                  ]}
                />
                <Button
                  icon={<RefreshIcon size={14} />}
                  onClick={handleRefresh}
                  loading={loading}
                  size="small"
                />
              </div>
            }
          >
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Subscriptions" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title="Subscription Status" 
            className="rounded-2xl shadow h-full"
            loading={loading}
          >
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderUsersTab = () => (
    <Card 
      title="User Analytics" 
      className="rounded-2xl shadow"
      extra={
        <Button
          icon={<DownloadIcon size={14} />}
          onClick={handleExport}
          disabled={loading}
        >
          Export
        </Button>
      }
    >
      <div className="mb-6" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={usersByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="count"
              name="New Users"
              stroke="#4f46e5"
              fill="#4f46e5"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <Table
        rowKey={(record) => record.id || record._id || Math.random().toString(36).substr(2, 9)}
        dataSource={users.slice(0, 10)}
        columns={[
          {
            title: 'User',
            dataIndex: 'email',
            key: 'email',
            render: (email, record) => (
              <div>
                <div className="font-medium">
                  {record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim() || '—'}
                </div>
                <div className="text-gray-500 text-sm">{email || '—'}</div>
              </div>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <StatusTag status={status?.toLowerCase()} />
          },
          {
            title: 'Joined',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '—',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          }
        ]}
        loading={loading}
        pagination={false}
      />
    </Card>
  );

  const renderSubscriptionsTab = () => (
    <Card 
      title="Subscription Management" 
      className="rounded-2xl shadow"
      extra={
        <Space>
          <Select
            mode="multiple"
            placeholder="Filter by status"
            style={{ width: 200 }}
            onChange={handleStatusFilterChange}
            value={statusFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'pending', label: 'Pending' },
              { value: 'canceled', label: 'Canceled' }
            ]}
          />
          <Button
            icon={<DownloadIcon size={14} />}
            onClick={handleExport}
            disabled={loading}
          >
            Export
          </Button>
        </Space>
      }
    >
      <Table
        rowKey={(record) => record.id || record._id || Math.random().toString(36).substr(2, 9)}
        dataSource={subs}
        columns={[
          {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            render: (id) => <Text copyable>{`#${id?.substring(0, 8) || 'N/A'}`}</Text>,
            sorter: (a, b) => (a.id || '').localeCompare(b.id || ''),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (_, record) => <StatusTag status={pickStatus(record)} />,
            sorter: (a, b) => pickStatus(a).localeCompare(pickStatus(b)),
            filters: [
              { text: 'Active', value: 'active' },
              { text: 'Expired', value: 'expired' },
              { text: 'Pending', value: 'pending' },
              { text: 'Canceled', value: 'canceled' },
            ],
            onFilter: (value, record) => pickStatus(record) === value,
          },
          {
            title: 'User',
            key: 'user',
            render: (_, record) => record?.user?.email || record?.userId || '—',
          },
          {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'plan',
            render: (plan) => plan?.name || plan || '—',
            sorter: (a, b) => (a.plan?.name || '').localeCompare(b.plan?.name || ''),
          },
          {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date) => (date ? dayjs(date).format('MMM D, YYYY') : '—'),
            sorter: (a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0),
          },
          {
            title: 'End Date',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date) => (date ? dayjs(date).format('MMM D, YYYY') : '—'),
            sorter: (a, b) => new Date(a.endDate || 0) - new Date(b.endDate || 0),
          },
          {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => (date ? dayjs(date).format('MMM D, YYYY') : '—'),
            sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
            defaultSortOrder: 'descend',
          }
        ]}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Total ${total} subscriptions`,
        }}
        scroll={{ x: 'max-content' }}
        size="middle"
        bordered
      />
    </Card>
  );

  if (loading && !lastUpdated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title level={2} className="!mb-1">Analytics Dashboard</Title>
          {lastUpdated && (
            <Text type="secondary" className="text-sm">
              Last updated: {dayjs(lastUpdated).format('MMM D, YYYY h:mm A')}
            </Text>
          )}
        </div>
        
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
            className="w-full md:w-auto"
            format="MMM D, YYYY"
            allowClear={false}
          />
          <Button
            icon={<RefreshIcon size={16} />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <BarChartIcon size={16} className="mr-2" />
                Overview
              </span>
            ),
            children: renderOverviewTab()
          },
          {
            key: 'users',
            label: (
              <span>
                <UsersIcon size={16} className="mr-2" />
                Users
              </span>
            ),
            children: renderUsersTab()
          },
          {
            key: 'subscriptions',
            label: (
              <span>
                <SubIcon size={16} className="mr-2" />  {/* Changed from CreditCard to SubIcon */}
                Subscriptions
              </span>
            ),
            children: renderSubscriptionsTab()
          }
        ]}
      />

      {error && (
        <div className="mt-6">
          <Card className="border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <CloseCircleOutlined className="text-red-500 text-lg mt-0.5" />
              <div>
                <div className="text-red-600 font-medium">Failed to load data</div>
                <div className="text-gray-600 text-sm mt-1">{error}</div>
                <div className="mt-3 text-sm">
                  <div className="font-medium mb-1">Troubleshooting steps:</div>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Verify your backend is running and accessible</li>
                    <li>Check your network connection</li>
                    <li>Ensure your authentication token is valid</li>
                    <li>Review browser console for detailed error messages</li>
                  </ul>
                </div>
                <Button
                  type="primary"
                  danger
                  size="small"
                  className="mt-3"
                  onClick={handleRefresh}
                  loading={loading}
                  icon={<RefreshIcon size={14} />}
                >
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
