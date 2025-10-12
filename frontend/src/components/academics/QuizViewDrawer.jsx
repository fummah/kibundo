import React from "react";
import { Button, Card, Descriptions, Drawer, Space, Tag, Image } from "antd";
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
                    <div>
                      {q.randomize && <div className="text-xs text-blue-600 mb-2">✓ Choices will be randomized</div>}
                      <div className="space-y-2">
                        {(q.choices || []).map((c, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2 border rounded ${idx === Number(q.answerIndex) ? "font-semibold bg-green-50 border-green-300" : "bg-white"}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-mono text-sm text-gray-500">{idx + 1}.</span>
                              <div className="flex-1">
                                <SafeText value={c?.text} />
                                {c?.tags && c.tags.length > 0 && (
                                  <div className="mt-1">
                                    <Space size="small" wrap>
                                      {c.tags.map((tag, ti) => (
                                        <Tag key={ti} size="small">{tag}</Tag>
                                      ))}
                                    </Space>
                                  </div>
                                )}
                                {c?.image_url && (
                                  <div className="mt-2">
                                    <Image
                                      src={c.image_url}
                                      alt={`Choice ${idx + 1}`}
                                      width={120}
                                      height={120}
                                      style={{ objectFit: "cover", borderRadius: 4 }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
