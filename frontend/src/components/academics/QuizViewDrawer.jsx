import React from "react";
import { Button, Card, Descriptions, Drawer, Space, Tag } from "antd";
import { SafeText, SafeTags } from "@/utils/safe";
import { fromApiItem } from "@/utils/academics/transforms";

export default function QuizViewDrawer({ open, onClose, record, onEdit, onToggle, onDelete }) {
  const items = React.useMemo(() => {
    const raw = (record?.items || record?.questions || []);
    return raw.map((q) => {
      // If API-style with 'multiple-choice', normalize for display
      return (q && typeof q.type === "string" && (q.type.includes("multiple") || q.type.includes("true") || q.type.includes("short")))
        ? fromApiItem(q)
        : q;
    });
  }, [record]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Quiz"
      width={Math.min(680, typeof window !== "undefined" ? window.innerWidth - 32 : 680)}
      extra={
        record ? (
          <Space>
            <Button onClick={onEdit}>Edit</Button>
            <Button onClick={onToggle}>
              {record.status === "live" ? "Unpublish" : "Publish"}
            </Button>
            <Button danger onClick={onDelete}>Delete</Button>
          </Space>
        ) : null
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      {record ? (
        <Descriptions column={1} bordered size="middle">
          <Descriptions.Item label="Title"><SafeText value={record.title} /></Descriptions.Item>
          <Descriptions.Item label="Bundesland"><SafeText value={record.bundesland} /></Descriptions.Item>
          <Descriptions.Item label="Subject"><SafeText value={record.subject} /></Descriptions.Item>
          <Descriptions.Item label="Grade"><SafeText value={record.grade} /></Descriptions.Item>
          <Descriptions.Item label="Difficulty">
            <Tag color={record.difficulty === "easy" ? "green" : record.difficulty === "hard" ? "volcano" : "geekblue"}>
              <SafeText value={record.difficulty} />
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={record.status === "live" ? "green" : record.status === "review" ? "geekblue" : "default"}>
              <SafeText value={record.status} />
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Tags"><SafeTags value={record.tags} /></Descriptions.Item>

          <Descriptions.Item label="Description">
            <div dangerouslySetInnerHTML={{ __html: record.description || "" }} />
          </Descriptions.Item>

          <Descriptions.Item label="Items">
            <div className="space-y-4">
              {items.map((q, i) => (
                <Card key={i} size="small" title={`Q${i + 1} • ${q.type}`}>
                  <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
                  {q.type === "mcq" ? (
                    <ol className="list-decimal pl-5">
                      {(q.choices || []).map((c, idx) => (
                        <li key={idx} className={idx === Number(q.answerIndex) ? "font-semibold" : ""}>
                          <SafeText value={c?.text} />
                        </li>
                      ))}
                    </ol>
                  ) : q.type === "short" ? (
                    <div className="text-gray-500">Answer: <SafeText value={q.answerText || "—"} /></div>
                  ) : (
                    <div className="text-gray-500">Answer: {String(q.answerBool ?? true)}</div>
                  )}
                </Card>
              ))}
            </div>
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Drawer>
  );
}
