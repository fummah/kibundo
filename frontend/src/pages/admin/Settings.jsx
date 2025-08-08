import { useEffect, useState } from "react";
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Upload,
  message,
  Avatar,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  UploadOutlined,
  SaveOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import api from "../../api/axios";
import { useAuthContext } from "../../context/AuthContext";

const { TabPane } = Tabs;

export default function SettingsPage() {
  const { user, updateUser } = useAuthContext();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      name: user?.name,
      email: user?.email,
    });
  }, [user]);

  const handleSaveSettings = async (values) => {
    try {
      setLoading(true);
      await api.put("/api/user/settings", {
        ...values,
        darkMode,
      });
      updateUser({ ...user, ...values });
      message.success("Settings saved successfully");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (info) => {
    if (info.file.status === "done") {
      message.success(`${info.file.name} uploaded`);
      updateUser({ ...user, avatar: info.file.response.url });
    } else if (info.file.status === "error") {
      message.error(`${info.file.name} upload failed`);
    }
  };

  const toggleDarkMode = (checked) => {
    const theme = checked ? "dark" : "light";
    localStorage.setItem("theme", theme);
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
  };

  const handlePasswordChange = async (values) => {
    try {
      setPasswordLoading(true);
      await api.post("/api/user/change-password", values);
      passwordForm.resetFields();
      message.success("Password changed successfully");
    } catch {
      message.error("Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        ⚙️ Settings
      </h2>

      <Card className="dark:bg-gray-800 dark:text-white">
        <Tabs defaultActiveKey="1" tabBarGutter={40}>
          {/* 🧑 Account */}
          <TabPane tab={<span><UserOutlined /> Account</span>} key="1">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveSettings}
              className="max-w-xl"
            >
              <Form.Item label="Name" name="name">
                <Input placeholder="Your name" />
              </Form.Item>
              <Form.Item label="Email" name="email">
                <Input placeholder="Email address" />
              </Form.Item>
              <Form.Item label="Avatar">
                <Upload
                  name="avatar"
                  action="/api/user/upload-avatar"
                  showUploadList={false}
                  onChange={handleAvatarChange}
                >
                  <Button icon={<UploadOutlined />}>Upload Avatar</Button>
                </Upload>
              </Form.Item>
              <div className="flex items-center gap-4 my-4">
                <Avatar src={user?.avatar} size={64} icon={<UserOutlined />} />
                <span className="text-gray-500 dark:text-gray-300">Current Avatar</span>
              </div>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Save Settings
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          {/* 🔐 Security */}
          <TabPane tab={<span><LockOutlined /> Security</span>} key="2">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
              className="max-w-xl"
            >
              <Form.Item
                label="Current Password"
                name="currentPassword"
                rules={[{ required: true, message: "Enter your current password" }]}
              >
                <Input.Password placeholder="Current Password" />
              </Form.Item>
              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[{ required: true, message: "Enter a new password" }]}
              >
                <Input.Password placeholder="New Password" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<KeyOutlined />}
                  loading={passwordLoading}
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          {/* 🔔 Notifications */}
          <TabPane tab={<span><BellOutlined /> Notifications</span>} key="3">
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              Manage notification preferences.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Notification settings coming soon...
            </p>
          </TabPane>

          {/* 🌙 Appearance */}
          <TabPane tab="🌙 Appearance" key="4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Enable Dark Mode
              </span>
              <Switch checked={darkMode} onChange={toggleDarkMode} />
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
