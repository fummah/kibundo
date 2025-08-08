import { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Drawer,
  Button,
  Typography,
  Space,
  Avatar,
  message,
} from "antd";
import {
  UserOutlined,
  EyeOutlined,
  TeamOutlined,
  BookOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

export default function NewApplicants() {
  const [applicants, setApplicants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/applicants/new")
      .then((res) => setApplicants(res.data))
      .catch(() => message.error("Failed to load applicants"))
      .finally(() => setLoading(false));
  }, []);

  const openDrawer = (record) => {
    setSelected(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: "Applicant",
      dataIndex: "firstName",
      key: "firstName",
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>
            {record.firstName} {record.lastName}
          </span>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        let color = "default";
        if (role === "Student") color = "geekblue";
        else if (role === "Teacher") color = "green";
        else if (role === "Parent") color = "volcano";
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: "Grade",
      dataIndex: "grade",
      key: "grade",
    },
    {
      title: "Submitted",
      dataIndex: "date",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button icon={<EyeOutlined />} onClick={() => openDrawer(record)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6  dark:bg-gray-900 dark:text-white">
      <Title level={3}>
        <Title level={3}>📥 New Applicants</Title>
      </Title>
      <Text type="secondary">
        Below is the list of new sign-ups awaiting review.
      </Text>

      <Table
        className="mt-6"
        columns={columns}
        dataSource={applicants}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        bordered
        scroll={{ x: true }}
      />

      <Drawer
        title={`Application: ${selected?.firstName} ${selected?.lastName}`}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={480}
      >
        {selected && (
          <div className="space-y-4">
            <p>
              <strong>Email:</strong> {selected.email}
            </p>
            <p>
              <strong>Phone:</strong> {selected.phone}
            </p>
            <p>
              <strong>Role:</strong>{" "}
              <Tag color="blue" icon={<BookOutlined />}>
                {selected.role}
              </Tag>
            </p>
            <p>
              <strong>Grade:</strong> {selected.grade}
            </p>
            {selected.subject && (
              <p>
                <strong>Subject:</strong> {selected.subject}
              </p>
            )}
            <p>
              <strong>Address:</strong> {selected.address}
            </p>
            <p>
              <strong>Description:</strong> {selected.description}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(selected.date).toLocaleString()}
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
