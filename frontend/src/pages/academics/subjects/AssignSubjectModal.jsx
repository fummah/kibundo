// src/pages/academics/subjects/AssignSubjectModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tabs, Table, Space, Button, Input, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import api from "@/api/axios";

const LS_KEY = "subjects.assignments.v1";

const readMap = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const writeMap = (m) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(m)); } catch {}
};

export const getSubjectAssignment = (subjectId) => {
  const m = readMap();
  return m?.[String(subjectId)] || { teacherIds: [], studentIds: [] };
};

export default function AssignSubjectModal({
  subjectId,
  open,
  onClose,
  onSaved, // optional callback
}) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [qT, setQT] = useState("");
  const [qS, setQS] = useState("");

  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // load lists + current selections
  useEffect(() => {
    if (!open || !subjectId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: tsRaw }, { data: ssRaw }] = await Promise.all([
          api.get("/allteachers"),
          api.get("/allstudents"),
        ]);
        const ts = Array.isArray(tsRaw) ? tsRaw : (tsRaw?.data ?? []);
        const ss = Array.isArray(ssRaw) ? ssRaw : (ssRaw?.data ?? []);
        setTeachers(ts);
        setStudents(ss);

        const current = getSubjectAssignment(subjectId);
        setSelectedTeacherIds((current.teacherIds || []).map(String));
        setSelectedStudentIds((current.studentIds || []).map(String));
      } catch {
        message.error("Failed to load people.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, subjectId]);

  const filteredTeachers = useMemo(() => {
    const q = qT.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = t.name || [t.first_name, t.last_name].filter(Boolean).join(" ");
      return `${name} ${t.email || ""}`.toLowerCase().includes(q);
    });
  }, [teachers, qT]);

  const filteredStudents = useMemo(() => {
    const q = qS.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = s.name || [s.first_name, s.last_name].filter(Boolean).join(" ");
      return `${name} ${s.email || ""}`.toLowerCase().includes(q);
    });
  }, [students, qS]);

  const save = () => {
    const map = readMap();
    map[String(subjectId)] = {
      teacherIds: selectedTeacherIds.map(String),
      studentIds: selectedStudentIds.map(String),
    };
    writeMap(map);
    message.success("Assignments saved.");
    onClose?.();
    onSaved?.({ subjectId, teacherIds: map[String(subjectId)].teacherIds, studentIds: map[String(subjectId)].studentIds });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={880}
      title={`Assign to Subject #${subjectId}`}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={save}>
            Save Assignments
          </Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: "teachers",
            label: "Teachers",
            children: (
              <>
                <div className="mb-2">
                  <Input
                    placeholder="Search teachers by name or email…"
                    value={qT}
                    onChange={(e) => setQT(e.target.value)}
                    allowClear
                  />
                </div>
                <Table
                  rowKey={(r) => String(r.id)}
                  size="small"
                  loading={loading}
                  dataSource={filteredTeachers}
                  pagination={{ pageSize: 8 }}
                  rowSelection={{
                    selectedRowKeys: selectedTeacherIds,
                    onChange: (keys) => setSelectedTeacherIds(keys.map(String)),
                  }}
                  columns={[
                    {
                      title: "Name",
                      dataIndex: "name",
                      render: (_, r) =>
                        r.name || [r.first_name, r.last_name].filter(Boolean).join(" ") || `#${r.id}`,
                    },
                    { title: "Email", dataIndex: "email" },
                  ]}
                />
              </>
            ),
          },
          {
            key: "students",
            label: "Students",
            children: (
              <>
                <div className="mb-2">
                  <Input
                    placeholder="Search students by name or email…"
                    value={qS}
                    onChange={(e) => setQS(e.target.value)}
                    allowClear
                  />
                </div>
                <Table
                  rowKey={(r) => String(r.id)}
                  size="small"
                  loading={loading}
                  dataSource={filteredStudents}
                  pagination={{ pageSize: 8 }}
                  rowSelection={{
                    selectedRowKeys: selectedStudentIds,
                    onChange: (keys) => setSelectedStudentIds(keys.map(String)),
                  }}
                  columns={[
                    {
                      title: "Name",
                      dataIndex: "name",
                      render: (_, r) =>
                        r.name || [r.first_name, r.last_name].filter(Boolean).join(" ") || `#${r.id}`,
                    },
                    { title: "Email", dataIndex: "email" },
                    { title: "Grade", dataIndex: "grade" },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}
