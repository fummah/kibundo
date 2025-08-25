import React from "react";
import { Collapse, Form, Grid } from "antd";

const { useBreakpoint } = Grid;

export default function ResponsiveFilters({ children }) {
  const screens = useBreakpoint();
  if (screens.md) {
    return (
      <div className="px-4 md:px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <Form layout="inline" className="gap-2">{children}</Form>
      </div>
    );
  }
  return (
    <Collapse
      ghost
      items={[{
        key: "filters",
        label: <span className="font-medium">Filters</span>,
        children: <Form layout="vertical" className="grid grid-cols-1 gap-3">{children}</Form>
      }]}
      className="px-2"
    />
  );
}
