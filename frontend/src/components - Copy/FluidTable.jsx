import React from "react";
import { Table } from "antd";

export default function FluidTable(props) {
  return (
    <Table
      size="middle"
      bordered={false}
      rowClassName="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      scroll={{ x: 980 }}
      {...props}
    />
  );
}
