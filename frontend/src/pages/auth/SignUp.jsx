// src/pages/auth/SignUp.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Select, Typography } from "antd";
import { PhoneOutlined, UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import api from "../../api/axios";
import { ROLE_PATHS } from "../../utils/roleMapper";

const { Option } = Select;
const { Title, Text } = Typography;

export default function SignUp() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    const { first_name, last_name, email, phone, password, confirm_password, role } = values;

    // Map role string to role_id
    const roleMap = {
      teacher: 2,
      student: 3,
      parent: 4,
    };

    const role_id = roleMap[role];

    if (!role_id) {
      toast.error("Invalid role selected.");
      return;
    }

    const payload = {
      first_name,
      last_name,
      email,
      phone,
      password,
      confirm_password,
      role_id,
    };

    try {
      setLoading(true);
      const res = await api.post("/auth/signup", payload);
      toast.success("Account created! Redirecting...");
      setTimeout(() => navigate("/signin"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-tr from-blue-100 via-white to-purple-100">
      <Toaster position="top-center" />

      
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl p-8">
        <Title level={3} className="text-center mb-6 text-indigo-700">
          Create Your Account
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          requiredMark={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: "Please enter your first name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="First Name" />
            </Form.Item>

            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: "Please enter your last name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Last Name" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
          rules={[
            { required: true, message: "Phone number is required" },
            {
             pattern: /^[6-9]\d{9}$/,
              message: "Enter a valid 10-digit Indian mobile number (e.g. 9123456789)",
              },
             ]}

          >
            <Input prefix={<PhoneOutlined />} placeholder="Phone number" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select placeholder="Select Role">
              <Option value="teacher">Teacher</Option>
              <Option value="student">Student</Option>
              <Option value="parent">Parent</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter a password" }]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm Password"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </Form.Item>

          <Text className="block text-center">
            Already have an account?{" "}
            <span
              className="text-indigo-600 cursor-pointer hover:underline"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </span>
          </Text>
        </Form>
      </div>
    </div>
  );
}
