import { Eye, EyeOff } from "lucide-react";

export default function AuthForm({
  mode,
  form,
  handleChange,
  showPassword,
  setShowPassword,
  remember,
  setRemember,
}) {
  return (
    <>
      {mode === "signup" && (
        <>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="input mb-2"
          />

          <input
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            className="input mb-2"
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="input mb-4"
          >
            <option value="">Select Role</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </>
      )}

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="input mb-2"
      />

      {mode !== "forgot" && (
        <>
          <div className="relative mb-2">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="input pr-10"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-2.5 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === "signup" && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="input mb-2"
            />
          )}
        </>
      )}

      {mode === "signin" && (
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember(!remember)}
            className="rounded"
          />
          <span className="text-sm">Remember me</span>
        </label>
      )}
    </>
  );
}
