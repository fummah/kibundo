import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Select, Button, Typography, Card } from "antd";
import { toast } from "react-toastify";
import api from "../../api/axios";

const { Option } = Select;
const { Title } = Typography;

export default function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "parent",
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/signup", form);
      toast.success("Registrierung erfolgreich!");
      navigate("/signin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-900 px-4">
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-white transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      <Card className="w-full max-w-md p-6 rounded-xl shadow-xl">
        <Title level={3} className="text-center mb-6">Registrieren</Title>

        <div className="space-y-4">
          <Input
            placeholder="First Name"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
          />
          <Input
            placeholder="Last Name"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          <Input.Password
            placeholder="Password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />
          <Input.Password
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
          />
          <Select
            value={form.role}
            onChange={(value) => handleChange("role", value)}
            className="w-full"
          >
            <Option value="teacher">Teacher</Option>
            <Option value="parent">Parent</Option>
          </Select>

          <Button
            type="primary"
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            loading={loading}
            onClick={handleSubmit}
          >
            Registrieren
          </Button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Bereits ein Konto?{" "}
            <span
              onClick={() => navigate("/signin")}
              className="text-indigo-600 cursor-pointer hover:underline"
            >
              Anmelden
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
