// src/pages/admin/settings/SettingsOverview.jsx
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
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user, updateUser } = useAuthContext();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [darkMode, setDarkMode] = useState(
    typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
  );
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      name: user?.name ?? "",
      email: user?.email ?? "",
    });
  }, [user, form]);

  const handleSaveSettings = async (values) => {
    try {
      setLoading(true);
      await api.put("/api/user/settings", { ...values, darkMode }, { withCredentials: true });
      updateUser?.({ ...user, ...values });
      message.success("Settings saved successfully");
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isImage) message.error("You can only upload image files!");
    if (!isLt2M) message.error("Image must be smaller than 2MB!");
    return isImage && isLt2M;
  };

  // Use Axios (with your interceptors) to upload the avatar, so auth is preserved.
  const handleAvatarUpload = async ({ file, onProgress, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await api.post("/api/user/upload-avatar", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: ({ loaded, total }) => {
          if (total) onProgress?.({ percent: Math.round((loaded / total) * 100) });
        },
      });

      const url = data?.url || data?.avatarUrl || data?.path;
      if (url) {
        updateUser?.({ ...user, avatar: url });
      }
      message.success("Avatar updated");
      onSuccess?.(data);
    } catch (err) {
      message.error(err?.response?.data?.message || "Avatar upload failed");
      onError?.(err);
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
      await api.post("/api/user/change-password", values, { withCredentials: true });
      passwordForm.resetFields();
      message.success("Password changed successfully");
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    {
      key: "account",
      label: (
        <span>
          <UserOutlined /> Account
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSettings}
          className="max-w-xl"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Your name is required" }]}
          >
            <Input placeholder="Your name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="Email address" />
          </Form.Item>

          <Form.Item label="Avatar">
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={handleAvatarUpload}
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
      ),
    },
    {
      key: "security",
      label: (
        <span>
          <LockOutlined /> Security
        </span>
      ),
      children: (
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
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password placeholder="New Password" />
          </Form.Item>
          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm New Password" />
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
      ),
    },
    {
      key: "notifications",
      label: (
        <span>
          <BellOutlined /> Notifications
        </span>
      ),
      children: (
        <>
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            Manage notification preferences.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notification settings coming soon...
          </p>
        </>
      ),
    },
    {
      key: "appearance",
      label: "🌙 Appearance",
      children: (
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            Enable Dark Mode
          </span>
          <Switch checked={darkMode} onChange={toggleDarkMode} />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        ⚙️ Settings
      </h2>
      <Card className="dark:bg-gray-800 dark:text-white">
        <Tabs defaultActiveKey="account" items={tabs} tabBarGutter={40} />
      </Card>
    </div>
  );
}
