// src/pages/auth/SignUp.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Form, Input, Button, Select, Typography } from "antd";
import { PhoneOutlined, UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import api from "../../api/axios";
import { ROLE_PATHS, ROLES } from "../../utils/roleMapper";
import { useAuthContext } from "../../context/AuthContext";

// ✅ Onboarding flags (shared with WelcomeIntro / WelcomeTour)
import { INTRO_LS_KEY, TOUR_LS_KEY } from "@/pages/student/onboarding/introFlags";

const { Option } = Select;
const { Title, Text } = Typography;

export default function SignUp() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuthContext(); // auto-login after signup

  const handleFinish = async (values) => {
    const { first_name, last_name, email, phone, password, confirm_password, role } = values;

    // Map UI role -> backend numeric role_id (temporarily only Student/Parent/Teacher)
    // If/when enabling School(4), Partner(5), or Admin(10), extend this map and the select options below.
    const roleMap = { student: 1, parent: 2, teacher: 3 };
    const role_id = roleMap[String(role)];

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
      const { data } = await api.post("/auth/signup", payload);

      const user = data?.user;
      const token = data?.token;
      if (!user || !token) {
        toast.error("Unexpected response. Please try again.");
        return;
      }

      // Persist session
      login(user, token);
      toast.success("Account created! Redirecting…");

      if (role_id === ROLES.STUDENT) {
        // Fresh onboarding for students: clear any previous flags
        try {
          localStorage.removeItem(INTRO_LS_KEY);
          localStorage.removeItem(TOUR_LS_KEY);
        } catch {}
        // Go to the Intro first
        navigate("/student/onboarding/welcome-intro", { replace: true });
        return;
      }

      // Non-students → role landing (teacher/parent/admin/etc.)
      const resolvedRoleId = Number(user.role_id ?? user.roleId ?? user?.role?.id ?? role_id);
      const rolePath = ROLE_PATHS[resolvedRoleId] || "/dashboard";
      navigate(rolePath, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Signup failed";
      toast.error(msg);
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
              <Input
                prefix={<UserOutlined />}
                placeholder="First Name"
                autoComplete="given-name"
                disabled={loading}
              />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: "Please enter your last name" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Last Name"
                autoComplete="family-name"
                disabled={loading}
              />
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
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
              autoComplete="email"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: "Phone number is required" },
              { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit mobile number" },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Phone number"
              autoComplete="tel"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select placeholder="Select Role" disabled={loading}>
              <Option value="student">Student</Option>
              <Option value="parent">Parent</Option>
              <Option value="teacher">Teacher</Option>
              {/** Temporarily hidden:
               * <Option value="school">School</Option>
               * <Option value="partner">Partner</Option>
               * Admin is not self-signup and uses role_id 10
               */}
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter a password" }]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="new-password"
              disabled={loading}
            />
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
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              autoComplete="new-password"
              disabled={loading}
            />
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
