import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Player } from "@lottiefiles/react-lottie-player";
import { useNavigate } from "react-router-dom";
import animationData from "../../assets/learning-bot.json";
import api from "../../api/axios";
import { useAuthContext } from "../../context/AuthContext";
import { ROLE_PATHS } from "../../utils/roleMapper";

export default function AuthForm({ mode = "signin" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [hasMounted, setHasMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  useEffect(() => setHasMounted(true), []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, password, confirmPassword } = form;
    if (!email || !password || (isSignup && !confirmPassword)) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isSignup ? "/auth/signup" : "/auth/login";
      const payload = isSignup
        ? form
        : { email: form.email, password: form.password };

      const response = await api.post(endpoint, payload);
      const { user, token } = response.data;

      login(user, token);
      toast.success(`${isSignup ? "Signup" : "Login"} successful`);

      setTimeout(() => {
        const redirectPath = ROLE_PATHS[user.role_id] || "/dashboard";
        navigate(redirectPath, { replace: true });
      }, 200);
    } catch (err) {
      toast.error(
        `${isSignup ? "Signup" : "Login"} failed: ${err.response?.data?.message || "Server error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getPortalTitle = () => {
    const role = form.role || "User";
    const titleMap = {
      admin: "Admin Portal",
      teacher: "Teacher Portal",
      student: "Student Portal",
      parent: "Parent Portal",
    };
    return titleMap[role] || "Kibundo LMS";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#dbeafe] via-white to-[#ede9fe] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-10">
      <Toaster position="top-center" />
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

      <div className="backdrop-blur-md bg-white/70 dark:bg-white/10 shadow-xl border border-white/30 dark:border-gray-700 rounded-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row z-10">
        {/* Left: Lottie Animation */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-b from-indigo-500 to-blue-600 dark:from-indigo-700 dark:to-blue-800 text-white p-10 md:w-1/2">
          {hasMounted && (
            <Player autoplay loop src={animationData} style={{ height: "260px", width: "260px" }} />
          )}
          <h2 className="text-3xl font-bold mt-4">{getPortalTitle()}</h2>
          <p className="text-center mt-2 text-sm text-blue-100">
            {isSignup ? "Join your learning journey" : "Welcome to your portal"}
          </p>
        </div>

        {/* Right: Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
            {isSignup ? "Konto erstellen" : `${getPortalTitle()} Anmeldung`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>

                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password */}
            {isSignup && (
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            )}

            {/* Role Dropdown */}
            {isSignup && (
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center transition"
            >
              {loading && (
                <svg className="animate-spin mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? (isSignup ? "Wird registriert..." : "Wird angemeldet...") : isSignup ? "Registrieren" : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
