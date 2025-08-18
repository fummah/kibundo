import { useEffect, useState } from "react";
import {
  Table,
  Typography,
  Card,
  Row,
  Col,
  Space,
  Spin,
  message,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const roleIcons = {
  admin: <SafetyOutlined />,
  teacher: <BookOutlined />,
  student: <UserOutlined />,
  parent: <TeamOutlined />,
};

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/allroles")
      .then((res) => {
        setRoles(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching roles:", err);
        message.error("Failed to fetch roles");
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: "Role",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <Space>
          <span className="text-lg">
            {roleIcons[text?.toLowerCase()] || <UserOutlined />}
          </span>
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm"],
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-white dark:bg-gray-900 dark:text-white">
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <Title level={3} className="!text-gray-800 dark:!text-white">
            🛡️ Role Management
          </Title>
          <Text type="secondary" className="dark:text-gray-400">
            Manage roles and control access across the platform.
          </Text>
        </Col>
      </Row>

      <Card className="rounded-xl shadow-md">
        {loading ? (
          <div className="py-12 text-center">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={roles}
            rowKey={(record) => record.id}
            pagination={{ pageSize: 5 }}
            scroll={{ x: true }}
          />
        )}
      </Card>
    </div>
  );
}
