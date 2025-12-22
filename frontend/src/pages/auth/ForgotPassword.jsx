import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import AuthForm from "../../components/Auth/AuthForm";
import api from "../../api/axios";
import globalBg from "@/assets/backgrounds/global-bg.png";

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
    <div className="flex justify-center bg-white overflow-hidden min-h-screen w-full relative">
      <div
        className="relative w-full"
        style={{
          maxWidth: "1280px",
          minHeight: "100vh",
          margin: "0 auto",
          boxSizing: "border-box",
          background: "#FFFFFF",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={globalBg}
            alt="Background"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center px-4 py-10 min-h-screen">
          <Toaster position="top-center" />
          <form
            onSubmit={handleSubmit}
            className="bg-white/95 p-8 rounded-2xl shadow-md w-full max-w-md space-y-4"
          >
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
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="text-center text-sm">
              Erinnert?{" "}
              <span
                onClick={() => navigate("/signin")}
                className="text-indigo-600 cursor-pointer hover:underline"
              >
                Zurück zur Anmeldung
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
