// src/components/schools/EditTeacherDrawer.jsx

import { Drawer, Form, Input, Select, Button, message, Spin } from "antd";
import { useEffect, useState } from "react";
import axios from "axios";
import api from "../../api/axios";

const { Option } = Select;

export default function EditTeacherDrawer({ open, onClose, teacher, refresh }) {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      if (teacher) {
        form.setFieldsValue({
          firstName: teacher.user?.firstName || "",
          lastName: teacher.user?.lastName || "",
          email: teacher.user?.email || "",
          phone: teacher.user?.phone || "",
          grade: teacher.class?.class_name || "",
          subjects: teacher.subjects?.map((s) => s.subject_name) || [],
        });
      }
    }
  }, [open, teacher]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes] = await Promise.all([
        api.get("/allclasses"),
        api.get("/allsubjects"),
      ]);
      setClasses(classRes.data);
      setSubjects(subjectRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
      message.error("Failed to load class or subject data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        subjects: values.subjects || [], // array of subject names
        grade: values.grade, // class name
      };
      await api.put(`/allteachers/${teacher.id}`, payload);
      message.success("Teacher updated successfully");
      onClose();
      refresh(); // refresh parent list
    } catch (err) {
      console.error("Update error:", err);
      message.error("Failed to update teacher");
    }
  };

  return (
    <Drawer
      title="✏️ Edit Teacher"
      onClose={onClose}
      open={open}
      width={window.innerWidth < 768 ? "100%" : 500}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <Form layout="vertical" form={form}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="subjects" label="Subjects" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select subject(s)">
              {subjects.map((s) => (
                <Option key={s.id} value={s.subject_name}>
                  {s.subject_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
            <Select placeholder="Select grade">
              {classes.map((g) => (
                <Option key={g.id} value={g.class_name}>
                  {g.class_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleUpdate} block>
              Update Teacher
            </Button>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
