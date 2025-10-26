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
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      contact_number: user?.contact_number ?? "",
      state: user?.state ?? "",
    });
  }, [user, form]);

  const handleSaveSettings = async (values) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/users/${user?.id}`, values, { withCredentials: true });
      if (response.data?.user) {
        updateUser?.(response.data.user);
      } else {
        updateUser?.({ ...user, ...values });
      }
      message.success("Einstellungen erfolgreich gespeichert");
    } catch (err) {
      message.error(err?.response?.data?.message || "Fehler beim Speichern der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isImage) message.error("Nur Bilddateien sind erlaubt!");
    if (!isLt2M) message.error("Bild muss kleiner als 2MB sein!");
    return isImage && isLt2M;
  };

  // Use Axios (with your interceptors) to upload the avatar, so auth is preserved.
  const handleAvatarUpload = async ({ file, onProgress, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/api/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: ({ loaded, total }) => {
          if (total) onProgress?.({ percent: Math.round((loaded / total) * 100) });
        },
      });

      const url = data?.url || data?.fileUrl || data?.path;
      if (url) {
        // Update user with new avatar URL
        const response = await api.put(`/api/users/${user?.id}`, { avatar: url }, { withCredentials: true });
        if (response.data?.user) {
          updateUser?.(response.data.user);
        } else {
          updateUser?.({ ...user, avatar: url });
        }
      }
      message.success("Avatar erfolgreich aktualisiert");
      onSuccess?.(data);
    } catch (err) {
      message.error(err?.response?.data?.message || "Avatar-Upload fehlgeschlagen");
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
    message.warning("Passwort-Änderung ist derzeit nicht verfügbar. Bitte kontaktieren Sie den Administrator.");
  };

  const tabs = [
    {
      key: "account",
      label: (
        <span>
          <UserOutlined /> Konto
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
            label="Vorname"
            name="first_name"
            rules={[{ required: true, message: "Vorname ist erforderlich" }]}
          >
            <Input placeholder="Ihr Vorname" />
          </Form.Item>

          <Form.Item
            label="Nachname"
            name="last_name"
            rules={[{ required: true, message: "Nachname ist erforderlich" }]}
          >
            <Input placeholder="Ihr Nachname" />
          </Form.Item>

          <Form.Item
            label="E-Mail"
            name="email"
            rules={[
              { required: true, message: "E-Mail ist erforderlich" },
              { type: "email", message: "Gültige E-Mail eingeben" },
            ]}
          >
            <Input placeholder="E-Mail-Adresse" />
          </Form.Item>

          <Form.Item
            label="Telefonnummer"
            name="contact_number"
          >
            <Input placeholder="Telefonnummer" />
          </Form.Item>

          <Form.Item
            label="Bundesland"
            name="state"
          >
            <Input placeholder="Bundesland" />
          </Form.Item>

          <Form.Item label="Avatar">
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={handleAvatarUpload}
            >
              <Button icon={<UploadOutlined />}>Avatar hochladen</Button>
            </Upload>
          </Form.Item>

          <div className="flex items-center gap-4 my-4">
            <Avatar src={user?.avatar} size={64} icon={<UserOutlined />} />
            <span className="text-gray-500 dark:text-gray-300">Aktueller Avatar</span>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Einstellungen speichern
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "security",
      label: (
        <span>
          <LockOutlined /> Sicherheit
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
            label="Aktuelles Passwort"
            name="currentPassword"
            rules={[{ required: true, message: "Aktuelles Passwort eingeben" }]}
          >
            <Input.Password placeholder="Aktuelles Passwort" />
          </Form.Item>
          <Form.Item
            label="Neues Passwort"
            name="newPassword"
            rules={[
              { required: true, message: "Neues Passwort eingeben" },
              { min: 6, message: "Mindestens 6 Zeichen" },
            ]}
          >
            <Input.Password placeholder="Neues Passwort" />
          </Form.Item>
          <Form.Item
            label="Passwort bestätigen"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Passwort bestätigen" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwörter stimmen nicht überein"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Passwort bestätigen" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<KeyOutlined />}
              loading={passwordLoading}
            >
              Passwort ändern
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
