// src/pages/parent/learning/Scans.jsx
import { useState } from "react";
import { Card, Upload, List, Avatar, Button, Tag, message } from "antd";
import { UploadOutlined, FileSearchOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import GradientShell from "@/components/GradientShell";

export default function Scans() {
  const [items, setItems] = useState([
    { id: 1, name: "Math-worksheet.pdf", subject: "Math", at: dayjs().subtract(1, "day").toISOString(), status: "Processed" },
    { id: 2, name: "Reading-log.jpg", subject: "Reading", at: dayjs().subtract(3, "day").toISOString(), status: "Queued" },
  ]);

  const beforeUpload = (file) => {
    setItems(prev => [{ id: Date.now(), name: file.name, subject: "Unknown", at: new Date().toISOString(), status: "Queued" }, ...prev]);
    message.success(`Added ${file.name} to processing queue`);
    return false; // prevent actual upload
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold m-0">Homework Scans</h1>
          <p className="text-gray-600 m-0">Add and track scanned homework or worksheets.</p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <Upload.Dragger multiple beforeUpload={beforeUpload} showUploadList={false}>
            <p className="ant-upload-drag-icon"><FileSearchOutlined /></p>
            <p className="ant-upload-text">Click or drag files to this area to scan</p>
            <p className="ant-upload-hint">PDF, JPG, PNG — simulated processing (no real upload).</p>
          </Upload.Dragger>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <List
            header={<div className="font-semibold">Recent Scans</div>}
            dataSource={items}
            renderItem={(i) => (
              <List.Item
                actions={[
                  <Button key="remove" danger type="link" icon={<DeleteOutlined />} onClick={() => removeItem(i.id)}>
                    Remove
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<FileSearchOutlined />} />}
                  title={<span className="font-semibold">{i.name}</span>}
                  description={
                    <div className="flex items-center gap-2">
                      <Tag color="blue">{i.subject}</Tag>
                      <span className="text-gray-500">{dayjs(i.at).format("MMM D, HH:mm")}</span>
                      <Tag color={i.status === "Processed" ? "green" : "gold"}>{i.status}</Tag>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    </GradientShell>
  );
}
