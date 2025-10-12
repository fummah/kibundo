import { useEffect, useState } from "react";
import { Drawer, Form, Input, Select, Button, Space, message, Spin } from "antd";
import api from "../../api/axios"; // ✅ Authenticated axios instance

const { Option } = Select;

export default function AddStudentDrawer({ open, onClose, postUrl }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [existingStudents, setExistingStudents] = useState([]);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  const fetchDropdownOptions = async () => {
    setFetchingOptions(true);
    try {
      const [gradesRes, subjectsRes, studentsRes] = await Promise.all([
        api.get("/allclasses"),
        api.get("/allsubjects"),
        api.get("/allstudents"),
      ]);

      setGrades(gradesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setExistingStudents(studentsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch dropdown options:", err);
      message.error("Failed to load dropdown options.");
    } finally {
      setFetchingOptions(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDropdownOptions();
    }
  }, [open]);

  const handleFinish = async (values) => {
    console.log("📝 Submitted form values:", values);

    const fullName = values.name?.trim().toLowerCase();

    const duplicate = existingStudents.find(
      (s) => s.name?.trim().toLowerCase() === fullName
    );

    if (duplicate) {
      message.error("A student with this name already exists.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...values,
        status: "Pending",
      };

      console.log("📦 Payload being sent to backend:", payload);

      const response = await api.post(postUrl, payload); // ✅ Use authenticated axios

      console.log("✅ Backend response:", response.data);

      message.success("Student added successfully!");
      form.resetFields();
      onClose();
    } catch (error) {
      console.error("❌ Failed to add student:", error);
      message.error(
        error.response?.data?.message || "Failed to add student. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title="➕ Add New Student"
      width={window.innerWidth < 768 ? "100%" : 480}
      onClose={onClose}
      open={open}
      styles={{ body: {{ paddingBottom: 80 }}
    >
      {fetchingOptions ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <Form layout="vertical" form={form} onFinish={handleFinish}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter full name" }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[
              { required: true, message: "Please enter phone number" },
              { 
                pattern: /^(\+49|0)[1-9]\d{1,14}$/, 
                message: "Please enter a valid German phone number (e.g., +49 30 12345678)" 
              }
            ]}
          >
            <Input placeholder="+49 30 12345678" />
          </Form.Item>

          <Form.Item
            name="grade"
            label="Grade"
            rules={[{ required: true, message: "Please select grade" }]}
          >
            <Select placeholder="Select grade">
              {grades.map((g) => (
                <Option key={g.id} value={g.class_name}>
                  {g.class_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subjects"
            label="Subjects"
            rules={[{ required: true, message: "Please select at least one subject" }]}
          >
            <Select mode="multiple" placeholder="Select subjects">
              {subjects.map((s) => (
                <Option key={s.id} value={s.subject_name}>
                  {s.subject_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Student
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
