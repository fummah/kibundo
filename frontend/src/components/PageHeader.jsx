import React from "react";
import { Grid, Space, Typography } from "antd";

const { useBreakpoint } = Grid;

export default function PageHeader({ title, subtitle, extra }) {
  const screens = useBreakpoint();
  return (
    <div
      className="sticky top-16 z-10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
      style={{ padding: screens.md ? "16px 20px" : "12px 12px" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Typography.Title level={screens.md ? 2 : 4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" className="block mt-1">
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {extra && <Space wrap align="center">{extra}</Space>}
      </div>
    </div>
  );
}
