// src/components/theme/StudentThemeProvider.jsx
import { ConfigProvider, theme as antdTheme } from "antd";
import { useEffect } from "react";
import "@/styles/student-theme.css";

export default function StudentThemeProvider({ children }) {
  // Set the theme flag once (you can make this dynamic later)
  useEffect(() => {
    document.documentElement.setAttribute("data-student-theme", "buddy");
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "var(--student-primary)",
          colorInfo: "var(--student-primary)",
          colorSuccess: "var(--student-secondary)",
          colorWarning: "#f59e0b",
          colorError: "#ef4444",
          colorTextBase: "var(--student-text)",
          colorBorder: "var(--student-border)",
          colorBgContainer: "var(--student-surface)",
          colorBgLayout: "var(--student-surface-2)",
          borderRadius: 12,
        },
        components: {
          Button: { controlHeight: 36, borderRadius: 12 },
          Card: { borderRadiusLG: 16, boxShadowTertiary: "0 4px 24px rgba(0,0,0,.06)" },
          Segmented: { itemActiveBg: "rgba(255,122,26,.08)" },
          Tag: { defaultBg: "rgba(47,125,99,.08)", defaultColor: "var(--student-secondary)" },
        },
      }}
    >
      {/* Global student background */}
      <div className="min-h-screen student-bg">
        {children}
      </div>
    </ConfigProvider>
  );
}
