import React from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
// 👇 note the .js extension since your tokens file is JavaScript
import { KIB } from "@/styles/kibundoTokens.js";

export default function AppTheme({ children }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: KIB.colors.primary,
          colorText: KIB.colors.text,
          colorTextSecondary: KIB.colors.subtext,
          borderRadius: 12,
          fontSize: 14,
          // (optional) global shadow tune:
          // boxShadow: KIB.shadow.card,
        },
        components: {
          Button: { borderRadius: 999, controlHeight: 44, fontWeight: 600 },
          Card:   { borderRadiusLG: 16 },
          Tag:    { borderRadiusSM: 999 },
          Modal:  { borderRadiusLG: 16 },
          Radio:  { borderRadiusSM: 12 },
          Input:  { borderRadiusLG: 12 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
