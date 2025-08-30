import React from "react";
import { Button, Card, Space } from "antd";
import { ContainerOutlined, ReloadOutlined, DatabaseOutlined } from "@ant-design/icons";

export default function DatabaseManagement() {
  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <ContainerOutlined /> Database Management
      </h1>

      <Card className="mt-4" title="Maintenance">
        <Space wrap>
          <Button icon={<ReloadOutlined />}>Run Migrations</Button>
          <Button icon={<DatabaseOutlined />}>Backup Now</Button>
          <Button danger>Prune Old Backups</Button>
        </Space>
      </Card>
    </div>
  );
}
