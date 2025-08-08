import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import AuthForm from "../../components/Auth/AuthForm";
import api from "../../api/axios";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const mode = "forgot";

  const [form, setForm] = useState({ email: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword] = useState(false); // Not used but required by AuthForm
  const [remember] = useState(false);     // Not used but required by AuthForm

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return toast.error("Please enter your email.");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: form.email });
      toast.success("Reset instructions sent to your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-tr from-blue-100 via-white to-purple-100">
      <Toaster position="top-center" />
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center">Forgot Password</h2>
        <AuthForm
          mode={mode}
          form={form}
          handleChange={handleChange}
          showPassword={showPassword}
          setShowPassword={() => {}}
          remember={remember}
          setRemember={() => {}}
        />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <div className="text-center text-sm">
          Remembered?{" "}
          <span onClick={() => navigate("/signin")} className="text-indigo-600 cursor-pointer hover:underline">
            Back to Sign In
          </span>
        </div>
      </form>
    </div>
  );
}
