import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined } from "@ant-design/icons";
import { DownloadTableExcel } from "react-export-table-to-excel";
import { useAuth } from "@/hooks/useAuth";
import api from "@/api/axios";

const { Option } = Select;

export default function UserManagementPage() {
  const { user } = useAuth(); // Assume user.role is available
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const tableRef = useState(null)[0];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    setIsModalVisible(true);
    form.setFieldsValue(record);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      message.success("User deleted");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
    }
  };

  const handleSave = async (values) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, values);
        message.success("User updated");
      } else {
        await api.post("/users", values);
        message.success("User added");
      }
      fetchUsers();
      setIsModalVisible(false);
    } catch {
      message.error("Failed to save user");
    }
  };

  const columns = [
    { title: "Full Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Contact", dataIndex: "contact", key: "contact" },
    { title: "Address", dataIndex: "address", key: "address" },
    { title: "Location", dataIndex: "location", key: "location" },
    {
      title: "Actions",
      render: (_, record) =>
        user.role === "admin" && (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            <Popconfirm
              title="Delete user?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          👥 Manage Users
        </h2>
        <Space>
          <DownloadTableExcel
            filename="users-data"
            sheet="users"
            currentTableRef={tableRef}
          >
            <Button icon={<DownloadOutlined />}>Export CSV</Button>
          </DownloadTableExcel>
          {user.role === "admin" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add User
            </Button>
          )}
        </Space>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{ pageSize: 8 }}
        ref={tableRef}
      />

      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Save"
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }]}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select>
              <Option value="admin">Admin</Option>
              <Option value="teacher">Teacher</Option>
              <Option value="student">Student</Option>
              <Option value="parent">Parent</Option>
            </Select>
          </Form.Item>
          <Form.Item name="contact" label="Contact Number">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="Use Google Autocomplete here" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
