// src/pages/academics/subjects/SubjectDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Descriptions, Space, Typography, Button, Spin, message, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { EditOutlined, ArrowLeftOutlined, UserSwitchOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import AssignSubjectModal, { getSubjectAssignment } from "./AssignSubjectModal.jsx";

const { Title } = Typography;
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  const classLabel = (cls) =>
    cls?.name || cls?.class_name || cls?.title || (cls?.id ? `Class #${cls.id}` : "—");

  const classNameFromId = (cid) => {
    const cls = classes.find((c) => String(c.id) === String(cid));
    return classLabel(cls);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: subjRaw }, { data: clsRaw }, { data: tsRaw }, { data: ssRaw }] = await Promise.all([
        api.get(`/subject/${id}`),
        api.get("/allclasses"),
        api.get("/allteachers"),
        api.get("/allstudents"),
      ]);

      const subj = subjRaw?.data ?? subjRaw ?? {};
      setSubject(subj);

      const cls = Array.isArray(clsRaw) ? clsRaw : (clsRaw?.data ?? []);
      setClasses(Array.isArray(cls) ? cls : []);

      const ts = Array.isArray(tsRaw) ? tsRaw : (tsRaw?.data ?? []);
      const ss = Array.isArray(ssRaw) ? ssRaw : (ssRaw?.data ?? []);
      setTeachers(ts);
      setStudents(ss);
    } catch {
      message.error("Failed to load subject.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Resolve assigned names from localStorage ids
  const assigned = useMemo(() => {
    const map = getSubjectAssignment(id);
    const tNames = (map.teacherIds || [])
      .map((tid) => teachers.find((t) => String(t.id) === String(tid)))
      .filter(Boolean)
      .map((t) => t.name || [t.first_name, t.last_name].filter(Boolean).join(" ") || `#${t.id}`);

    const sNames = (map.studentIds || [])
      .map((sid) => students.find((s) => String(s.id) === String(sid)))
      .filter(Boolean)
      .map((s) => s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || `#${s.id}`);

    return { teachers: tNames, students: sNames };
  }, [id, teachers, students]);

  const offered = typeof subject?.offered === "boolean" ? subject.offered : true;

  const handleDelete = async () => {
    try {
      await api.delete(`/subject/${id}`);
      message.success("Subject deleted.");
      navigate("/admin/academics/subjects");
    } catch {
      message.error("Delete failed.");
    }
  };

  if (loading) return <Spin />;
  if (!subject) return null;

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Title level={3} className="!mb-0">Subject Detail</Title>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Button icon={<UserSwitchOutlined />} onClick={() => setAssignOpen(true)}>Assign</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Delete</Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/admin/academics/subjects/${id}/edit`)}>Edit</Button>
        </Space>
      </div>

      <Card>
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="ID">{subject.id}</Descriptions.Item>
          <Descriptions.Item label="Offered">{offered ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>}</Descriptions.Item>
          <Descriptions.Item label="Subject">{subject.subject_name || subject.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Class">{subject.class ? classLabel(subject.class) : classNameFromId(subject.class_id)}</Descriptions.Item>
          <Descriptions.Item label="Created By">{subject.userCreated?.name || subject.created_by_name || subject.created_by || "—"}</Descriptions.Item>
          <Descriptions.Item label="Created At">{fmt(subject.created_at || subject.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Teachers">{assigned.teachers.length ? assigned.teachers.join(", ") : "—"}</Descriptions.Item>
          <Descriptions.Item label="Students">{assigned.students.length ? assigned.students.join(", ") : "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <AssignSubjectModal
        subjectId={id}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSaved={() => {
          setAssignOpen(false);
          // re-compute names from fresh lists/localStorage
          // no server needed
          message.success("Assignments updated.");
        }}
      />
    </Space>
  );
}
