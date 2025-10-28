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
  Select,
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
import ImageCropModal from "@/components/common/ImageCropModal";

export default function SettingsPage() {
  const { user, updateUserSummary } = useAuthContext();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [darkMode, setDarkMode] = useState(
    typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
  );
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [imageSrcForCrop, setImageSrcForCrop] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [states, setStates] = useState([]);

  // Fetch states from API
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await api.get('/states');
        setStates(response.data || []);
      } catch (error) {
        console.error('Error fetching states:', error);
        message.error('Failed to load states');
      }
    };
    fetchStates();
  }, []);

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
      console.log('📤 Sending update request:', {
        userId: user?.id,
        values
      });
      
      const response = await api.put(`/users/${user?.id}`, values, { withCredentials: true });
      
      console.log('📥 Response received:', response.data);
      
      if (response.data?.user) {
        console.log('✅ Updating context with fresh user data:', response.data.user);
        updateUserSummary?.(response.data.user);
      } else {
        console.log('⚠️ No user in response, updating with local values');
        updateUserSummary?.({ ...user, ...values });
      }
      message.success("Settings saved successfully");
    } catch (err) {
      console.error('❌ Save settings error:', err);
      message.error(err?.response?.data?.message || "Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    const isLt2M = file.size / 1024 / 1024 < 10; // Increased to 10MB for pre-crop
    if (!isImage) {
      message.error("Only image files are allowed!");
      return false;
    }
    if (!isLt2M) {
      message.error("Image must be smaller than 10MB!");
      return false;
    }

    // Read file and show crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrcForCrop(e.target.result);
      setCropModalVisible(true);
    };
    reader.readAsDataURL(file);

    return false; // Prevent automatic upload
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob) => {
    try {
      setUploadingAvatar(true);
      setCropModalVisible(false);

      const formData = new FormData();
      formData.append("file", croppedBlob, "profile-picture.jpg");

      const { data } = await api.post("/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = data?.url || data?.fileUrl || data?.path;
      if (url) {
        // Update user with new avatar URL
        const response = await api.put(`/users/${user?.id}`, { avatar: url }, { withCredentials: true });
        if (response.data?.user) {
          updateUserSummary?.(response.data.user);
        } else {
          updateUserSummary?.({ ...user, avatar: url });
        }
        message.success("Profile picture updated successfully");
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Profile picture upload failed");
    } finally {
      setUploadingAvatar(false);
      setImageSrcForCrop(null);
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
      console.log('🔐 Password change request');
      
      const response = await api.post(`/users/${user?.id}/change-password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }, { withCredentials: true });
      
      console.log('✅ Password changed successfully');
      message.success("Password changed successfully!");
      passwordForm.resetFields();
    } catch (err) {
      console.error('❌ Password change error:', err);
      const errorMessage = err?.response?.data?.message || "Failed to change password";
      message.error(errorMessage);
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
            label="First Name"
            name="first_name"
            rules={[{ required: true, message: "First name is required" }]}
          >
            <Input placeholder="Your first name" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="last_name"
            rules={[{ required: true, message: "Last name is required" }]}
          >
            <Input placeholder="Your last name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input placeholder="Email address" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="contact_number"
          >
            <Input placeholder="Phone number" />
          </Form.Item>

          <Form.Item
            label="State/Region"
            name="state"
          >
            <Select
              placeholder="Select your state"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={states.map(state => ({
                value: state.state_name,
                label: state.state_name,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Profile Picture">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Avatar src={user?.avatar} size={64} icon={<UserOutlined />} />
                <div className="flex-1">
                  <Upload
                    name="avatar"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} loading={uploadingAvatar}>
                      {uploadingAvatar ? "Uploading..." : "Upload Profile Picture"}
                    </Button>
                  </Upload>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Click to upload, then crop your image to fit
                  </p>
                </div>
              </div>
            </div>
          </Form.Item>

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
            rules={[{ required: true, message: "Please enter current password" }]}
          >
            <Input.Password placeholder="Current password" />
          </Form.Item>
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 6, message: "At least 6 characters" },
            ]}
          >
            <Input.Password placeholder="New password" />
          </Form.Item>
          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm password" },
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
            <Input.Password placeholder="Confirm password" />
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
        <Tabs 
          defaultActiveKey="account" 
          items={tabs} 
          tabBarGutter={40}
          destroyInactiveTabPane={true}
        />
      </Card>

      {/* Image Crop Modal */}
      <ImageCropModal
        visible={cropModalVisible}
        imageSrc={imageSrcForCrop}
        onCancel={() => {
          setCropModalVisible(false);
          setImageSrcForCrop(null);
        }}
        onCropComplete={handleCroppedImage}
        aspect={1} // 1:1 aspect ratio for profile pictures
      />
    </div>
  );
}
