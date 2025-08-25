// src/pages/parent/learning/Resources.jsx
import { useMemo, useState } from "react";
import { Card, Row, Col, Tag, Input, Button, Segmented, message } from "antd";
import { BookOutlined, PlayCircleOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";

const DUMMY = [
  { id: 1, title: "Times Tables Game", type: "Game", subject: "Math", level: "Grade 3", image: "https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=800&auto=format&fit=crop" },
  { id: 2, title: "Reading Comprehension Pack", type: "Worksheet", subject: "Reading", level: "Grade 2", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" },
  { id: 3, title: "Plant Life Cycle", type: "Video", subject: "Science", level: "Grade 3", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop" },
  { id: 4, title: "Phonics Builder", type: "Game", subject: "Reading", level: "Grade 1", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop" },
];

export default function Resources() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all"); // all | Math | Reading | Science

  const pool = useMemo(() => {
    const base = subject === "all" ? DUMMY : DUMMY.filter(r => r.subject === subject);
    const qt = q.trim().toLowerCase();
    return base.filter(r =>
      r.title.toLowerCase().includes(qt) ||
      r.subject.toLowerCase().includes(qt) ||
      r.level.toLowerCase().includes(qt) ||
      r.type.toLowerCase().includes(qt)
    );
  }, [q, subject]);

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Resources</h1>
            <p className="text-gray-600 m-0">Games, worksheets and videos to support learning.</p>
          </div>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Math", value: "Math" },
              { label: "Reading", value: "Reading" },
              { label: "Science", value: "Science" },
            ]}
            value={subject}
            onChange={setSubject}
          />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <Input.Search
            placeholder="Search by title, subject, level or type"
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xl rounded-xl"
          />
        </Card>

        <Row gutter={[16, 16]}>
          {pool.map((r) => (
            <Col xs={24} sm={12} lg={8} key={r.id}>
              <Card
                hoverable
                className="rounded-2xl shadow-sm"
                cover={<img src={r.image} alt={r.title} className="h-40 object-cover" />}
                actions={[
                  <Button key="open" type="link" icon={<PlayCircleOutlined />} onClick={() => message.info(`Open: ${r.title}`)}>
                    Open
                  </Button>,
                ]}
              >
                <div className="font-semibold text-base">{r.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  <span><BookOutlined /> {r.subject}</span>
                  <Tag>{r.type}</Tag>
                  <Tag color="blue">{r.level}</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </GradientShell>
  );
}
