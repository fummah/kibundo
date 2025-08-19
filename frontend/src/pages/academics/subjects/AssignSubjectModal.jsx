import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Space, Tabs, Tag, Typography, message } from "antd";
import api from "@/api/axios";

const { Text } = Typography;

const labelOfTeacher = (t) =>
  t?.name || [t?.first_name, t?.last_name].filter(Boolean).join(" ") || t?.email || `Teacher #${t?.id}`;
const labelOfStudent = (s) =>
  s?.name || [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.email || `Student #${s?.id}`;

export default function AssignSubjectModal({ subjectId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [assignedTeachers, setAssignedTeachers] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);

  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const loadAll = async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const [{ data: tData }, { data: sData }, { data: aData }] = await Promise.all([
        api.get("/allteachers"),
        api.get("/allstudents"),
        api.get(`/subject/${subjectId}/assignments`),
      ]);
      setTeachers(Array.isArray(tData) ? tData : []);
      setStudents(Array.isArray(sData) ? sData : []);
      setAssignedTeachers(aData?.teachers ?? []);
      setAssignedStudents(aData?.students ?? []);
      setSelectedTeacherIds((aData?.teachers ?? []).map((t) => t.id));
      setSelectedStudentIds((aData?.students ?? []).map((s) => s.id));
    } catch {
      message.error("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subjectId]);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: labelOfTeacher(t) })),
    [teachers]
  );
  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: labelOfStudent(s) })),
    [students]
  );

  const saveTeachers = async () => {
    setSaving(true);
    try {
      const toAdd = selectedTeacherIds.filter(
        (id) => !(assignedTeachers || []).some((t) => String(t.id) === String(id))
      );
      const toRemove = (assignedTeachers || [])
        .map((t) => t.id)
        .filter((id) => !selectedTeacherIds.includes(id));

      await Promise.all([
        ...toAdd.map((id) => api.post(`/subject/${subjectId}/assign/teacher`, { teacher_id: id })),
        ...toRemove.map((id) => api.delete(`/subject/${subjectId}/assign/teacher/${id}`)),
      ]);

      message.success("Teacher assignments updated.");
      await loadAll();
    } catch {
      message.error("Failed to update teacher assignments.");
    } finally {
      setSaving(false);
    }
  };

  const saveStudents = async () => {
    setSaving(true);
    try {
      const toAdd = selectedStudentIds.filter(
        (id) => !(assignedStudents || []).some((s) => String(s.id) === String(id))
      );
      const toRemove = (assignedStudents || [])
        .map((s) => s.id)
        .filter((id) => !selectedStudentIds.includes(id));

      await Promise.all([
        ...toAdd.map((id) => api.post(`/subject/${subjectId}/assign/student`, { student_id: id })),
        ...toRemove.map((id) => api.delete(`/subject/${subjectId}/assign/student/${id}`)),
      ]);

      message.success("Student assignments updated.");
      await loadAll();
    } catch {
      message.error("Failed to update student assignments.");
    } finally {
      setSaving(false);
    }
  };

  const removeTeacher = async (id) => {
    try {
      await api.delete(`/subject/${subjectId}/assign/teacher/${id}`);
    } catch {}
    setSelectedTeacherIds((prev) => prev.filter((x) => x !== id));
    setAssignedTeachers((prev) => prev.filter((x) => x.id !== id));
  };

  const removeStudent = async (id) => {
    try {
      await api.delete(`/subject/${subjectId}/assign/student/${id}`);
    } catch {}
    setSelectedStudentIds((prev) => prev.filter((x) => x !== id));
    setAssignedStudents((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <Modal
      open={open}
      title={`Assign Subject #${subjectId}`}
      onCancel={onClose}
      footer={null}
      width={720}
      confirmLoading={loading || saving}
      destroyOnClose
    >
      <Tabs
        defaultActiveKey="teachers"
        items={[
          {
            key: "teachers",
            label: "Teachers",
            children: (
              <Space direction="vertical" className="w-full" size="large">
                <div>
                  <Text type="secondary">Select teachers to be assigned to this subject.</Text>
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Pick teacher(s)…"
                    options={teacherOptions}
                    value={selectedTeacherIds}
                    onChange={setSelectedTeacherIds}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm text-gray-500">Currently assigned</div>
                  <Space wrap>
                    {(assignedTeachers || []).length === 0 && <Text type="secondary">None yet</Text>}
                    {(assignedTeachers || []).map((t) => (
                      <Tag key={t.id} closable onClose={() => removeTeacher(t.id)}>
                        {labelOfTeacher(t)}
                      </Tag>
                    ))}
                  </Space>
                </div>

                <div className="flex justify-end">
                  <Button type="primary" loading={saving} onClick={saveTeachers}>
                    Save Teacher Assignments
                  </Button>
                </div>
              </Space>
            ),
          },
          {
            key: "students",
            label: "Students",
            children: (
              <Space direction="vertical" className="w-full" size="large">
                <div>
                  <Text type="secondary">Select students to be assigned to this subject.</Text>
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Pick student(s)…"
                    options={studentOptions}
                    value={selectedStudentIds}
                    onChange={setSelectedStudentIds}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm text-gray-500">Currently assigned</div>
                  <Space wrap>
                    {(assignedStudents || []).length === 0 && <Text type="secondary">None yet</Text>}
                    {(assignedStudents || []).map((s) => (
                      <Tag key={s.id} closable onClose={() => removeStudent(s.id)}>
                        {labelOfStudent(s)}
                      </Tag>
                    ))}
                  </Space>
                </div>

                <div className="flex justify-end">
                  <Button type="primary" loading={saving} onClick={saveStudents}>
                    Save Student Assignments
                  </Button>
                </div>
              </Space>
            ),
          },
        ]}
      />
    </Modal>
  );
}
