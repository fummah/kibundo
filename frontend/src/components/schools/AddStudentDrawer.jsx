// src/components/students/AddStudentDrawer.jsx

import {
  Drawer, Form, Input, Select, Button, message, Spin
} from "antd";
import { useEffect, useState } from "react";
import api from "../../api/axios";

const { Option } = Select;

export default function AddStudentDrawer({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOptions = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        api.get("/allclasses"),
        api.get("/allsubjects"),
      ]);
      setGrades(gRes.data || []);
      setSubjects(sRes.data || []);
    } catch (err) {
      console.error("Dropdown fetch error:", err);
      message.error("Failed to load grade and subject options");
    }
  };

  useEffect(() => {
    if (open) {
      fetchOptions();
      form.resetFields();
    }
  }, [open]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await api.post("/addstudent", values);
      message.success("Student added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Failed to add student");
    } finally {
      setLoading(false);
    }
  };


  
  return (
    <Drawer
      title="➕ Add Student"
      open={open}
      onClose={onClose}
      width={window.innerWidth < 768 ? "100%" : 500}
    >
      <Spin spinning={loading}>
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="name" label="Student Name" rules={[{ required: true }]}>
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item name="class_id" label="Grade" rules={[{ required: true }]}>
            <Select placeholder="Select class">
              {grades.map((g) => (
                <Option key={g.id} value={g.id}>
                  {g.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
            <Select placeholder="Select subject">
              {subjects.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.subject_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select placeholder="Select status">
              <Option value="pending">Pending</Option>
              <Option value="enrolled">Enrolled</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Save Student
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
}
