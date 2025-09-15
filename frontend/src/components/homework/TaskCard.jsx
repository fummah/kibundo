import React from "react";
import { Card, Tag, Button } from "antd";

export default function TaskCard({ task, onOpen }) {
  const { subject, title, due, done } = task || {};
  return (
    <Card className="rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{subject}</div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-400 mt-1">Fällig: {due}</div>
        </div>
        <div className="flex items-center gap-2">
          <Tag color={done ? "green" : "orange"}>{done ? "fertig" : "offen"}</Tag>
          <Button type="link" onClick={() => onOpen?.(task)}>Öffnen</Button>
        </div>
      </div>
    </Card>
  );
}

