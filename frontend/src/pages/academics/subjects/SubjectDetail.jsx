import React, { useEffect, useState } from "react";
import { Card, Descriptions, Space, Typography, Button, Spin, message, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { EditOutlined, ArrowLeftOutlined, UserSwitchOutlined } from "@ant-design/icons";
import api from "@/api/axios";

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assigned, setAssigned] = useState({ teachers: [], students: [] });
  const [loading, setLoading] = useState(true);

  const classLabel = (cls) =>
    cls?.name || cls?.class_name || cls?.title || (cls?.id ? `Class #${cls.id}` : "—");

  const classNameFromId = (cid) => {
    const cls = classes.find((c) => String(c.id) === String(cid));
    return classLabel(cls);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: subj }, { data: cls }, { data: asg }] = await Promise.all([
        api.get(`/subject/${id}`),
        api.get("/allclasses"),
        api.get(`/subject/${id}/assignments`),
      ]);
      setSubject(subj);
      setClasses(Array.isArray(cls) ? cls : []);
      setAssigned({ teachers: asg?.teachers ?? [], students: asg?.students ?? [] });
    } catch {
      message.error("Failed to load subject.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <Spin />;
  if (!subject) return null;

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0">
          Subject Detail
        </Typography.Title>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button icon={<UserSwitchOutlined />} onClick={() => navigate(`/admin/academics/subjects`)}>
            Manage Assignments
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/admin/academics/subjects/${id}/edit`)}>
            Edit
          </Button>
        </Space>
      </div>

      <Card>
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="ID">{subject.id}</Descriptions.Item>
          <Descriptions.Item label="Subject">{subject.subject_name}</Descriptions.Item>
          <Descriptions.Item label="Class">
            {subject.class ? classLabel(subject.class) : classNameFromId(subject.class_id)}
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {subject.userCreated?.name || subject.created_by || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">{fmt(subject.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Teachers">
            {(assigned.teachers || []).length === 0
              ? "—"
              : (assigned.teachers || []).map(t => t.name || [t.first_name, t.last_name].filter(Boolean).join(" ") || `#${t.id}`).join(", ")}
          </Descriptions.Item>
          <Descriptions.Item label="Students">
            {(assigned.students || []).length === 0
              ? "—"
              : (assigned.students || []).map(s => s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || `#${s.id}`).join(", ")}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}
