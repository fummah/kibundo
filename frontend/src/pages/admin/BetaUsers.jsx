// src/pages/admin/BetaUsers.jsx
import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  message,
  Popconfirm,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
  Select,
  Input,
  Tooltip,
} from "antd";
import { 
  CheckOutlined, 
  CloseOutlined, 
  EyeOutlined, 
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StopOutlined
} from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import api from "@/api/axios";

const { Option } = Select;
const { Search } = Input;

const BetaStatusColors = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red'
};

const BetaStatusIcons = {
  pending: <ClockCircleOutlined />,
  approved: <CheckCircleOutlined />,
  rejected: <StopOutlined />
};

export default function BetaUsersManagement() {
  const { user } = useAuth();
  const [betaUsers, setBetaUsers] = useState([]);
  const [betaStats, setBetaStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  useEffect(() => {
    fetchBetaUsers();
    fetchBetaStats();
  }, []);

  const fetchBetaUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/beta-users");
      setBetaUsers(data);
    } catch (err) {
      message.error("Failed to load beta users");
    } finally {
      setLoading(false);
    }
  };

  const fetchBetaStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get("/beta-stats");
      setBetaStats(data);
    } catch (err) {
      message.error("Failed to load beta statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.patch(`/beta-users/${userId}/approve`);
      message.success("Beta user approved successfully!");
      fetchBetaUsers();
      fetchBetaStats();
    } catch (err) {
      message.error("Failed to approve beta user");
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.patch(`/beta-users/${userId}/reject`);
      message.success("Beta user rejected successfully!");
      fetchBetaUsers();
      fetchBetaStats();
    } catch (err) {
      message.error("Failed to reject beta user");
    }
  };

  const showUserDetails = (user) => {
    setSelectedUser(user);
    setDetailsModalVisible(true);
  };

  const filteredUsers = betaUsers.filter(user => {
    const matchesSearch = !searchText || 
      user.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.beta_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.first_name} {record.last_name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: ["role", "name"],
      key: "role",
      render: (role) => role ? <Tag color="blue">{role}</Tag> : '-'
    },
    {
      title: "Status",
      dataIndex: "beta_status",
      key: "beta_status",
      render: (status) => (
        <Tag color={BetaStatusColors[status]} icon={BetaStatusIcons[status]}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Requested",
      dataIndex: "beta_requested_at",
      key: "beta_requested_at",
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: "Approved By",
      dataIndex: ["betaApprover", "first_name"],
      key: "approved_by",
      render: (_, record) => {
        if (record.beta_status === 'approved' && record.betaApprover) {
          return `${record.betaApprover.first_name} ${record.betaApprover.last_name}`;
        }
        return '-';
      }
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => showUserDetails(record)}
              size="small"
            />
          </Tooltip>
          
          {record.beta_status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <Popconfirm
                  title="Approve this beta user?"
                  description="This will give them access to the beta program."
                  onConfirm={() => handleApprove(record.id)}
                  okText="Approve"
                  cancelText="Cancel"
                >
                  <Button 
                    type="primary" 
                    icon={<CheckOutlined />} 
                    size="small"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  />
                </Popconfirm>
              </Tooltip>
              
              <Tooltip title="Reject">
                <Popconfirm
                  title="Reject this beta user?"
                  description="This will deny their access to the beta program."
                  onConfirm={() => handleReject(record.id)}
                  okText="Reject"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger 
                    icon={<CloseOutlined />} 
                    size="small"
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          🚀 Beta User Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage beta program applications and approvals
        </p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Beta Users"
              value={betaStats.total_beta_users || 0}
              prefix={<UserOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={betaStats.pending_approval || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved"
              value={betaStats.approved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Rejected"
              value={betaStats.rejected || 0}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="Search by name or email"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by status"
              size="large"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button onClick={fetchBetaUsers} loading={loading}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Beta Users Table */}
      <Table
        dataSource={filteredUsers}
        columns={columns}
        loading={loading}
        rowKey="id"
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} beta users`
        }}
        scroll={{ x: 1000 }}
      />

      {/* User Details Modal */}
      <Modal
        title="Beta User Details"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedUser && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Name:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {selectedUser.role?.name || '-'}</p>
                <p><strong>Contact:</strong> {selectedUser.contact_number || '-'}</p>
              </Col>
              <Col span={12}>
                <p><strong>Beta Status:</strong> 
                  <Tag color={BetaStatusColors[selectedUser.beta_status]} className="ml-2">
                    {selectedUser.beta_status?.toUpperCase()}
                  </Tag>
                </p>
                <p><strong>Requested:</strong> {selectedUser.beta_requested_at ? new Date(selectedUser.beta_requested_at).toLocaleString() : '-'}</p>
                <p><strong>Approved:</strong> {selectedUser.beta_approved_at ? new Date(selectedUser.beta_approved_at).toLocaleString() : '-'}</p>
                <p><strong>Approved By:</strong> {selectedUser.betaApprover ? 
                  `${selectedUser.betaApprover.first_name} ${selectedUser.betaApprover.last_name}` : '-'}</p>
              </Col>
            </Row>
            
            {selectedUser.beta_status === 'pending' && (
              <div className="mt-4 pt-4 border-t">
                <Space>
                  <Popconfirm
                    title="Approve this beta user?"
                    description="This will give them access to the beta program."
                    onConfirm={() => handleApprove(selectedUser.id)}
                    okText="Approve"
                    cancelText="Cancel"
                  >
                    <Button type="primary" icon={<CheckOutlined />}>
                      Approve User
                    </Button>
                  </Popconfirm>
                  
                  <Popconfirm
                    title="Reject this beta user?"
                    description="This will deny their access to the beta program."
                    onConfirm={() => handleReject(selectedUser.id)}
                    okText="Reject"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<CloseOutlined />}>
                      Reject User
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
