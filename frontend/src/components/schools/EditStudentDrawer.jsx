import { useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Button,
  Select,
  Space,
  Tag,
  message,
  Spin,
} from "antd";
import api from "../../api/axios";

const { Option } = Select;

export default function EditStudentDrawer({
  open,
  onCancel,
  student,
  onSave,
}) {
  const [form] = Form.useForm();
  const [statusOptions, setStatusOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const fetchStatusOptions = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get("/student-status-options");
      setStatusOptions(res.data || []);
    } catch (err) {
      message.error("Could not load status options");
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchSubjectOptions = async () => {
    setLoadingSubjects(true);
    try {
      const res = await api.get("/allsubjects");
      setSubjectOptions(res.data || []);
    } catch (err) {
      message.error("Could not load subjects");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchGradeOptions = async () => {
    setLoadingGrades(true);
    try {
      const res = await api.get("/allclasses");
      setGradeOptions(res.data || []);
    } catch (err) {
      message.error("Could not load grades");
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatusOptions();
      fetchSubjectOptions();
      fetchGradeOptions();
    }
  }, [open]);

  useEffect(() => {
    if (student) {
      form.setFieldsValue({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        grade: student.class_name,
        subjects: student.subjects,
        status: student.status,
      });
    } else {
      form.resetFields();
    }
  }, [student, form]);

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        const res = await onSave?.(values);
        if (res?.status === 200) {
          message.success("Student updated successfully");
          onCancel();
        } else {
          message.error(res?.data?.message || "Failed to update student.");
        }
      } catch (err) {
        console.error("Update error:", err);
        message.error("Failed to update student.");
      }
    });
  };

  return (
    <Drawer
      title="✏️ Edit Student"
      open={open}
      onClose={onCancel}
      width={window.innerWidth < 768 ? "100%" : 480}
      footer={
        <Space className="justify-end w-full">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit}>
            Save Changes
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="First Name"
          name="firstName"
          rules={[{ required: true, message: "First name is required" }]}
        >
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={[{ required: true, message: "Last name is required" }]}
        >
          <Input placeholder="Enter last name" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ type: "email", required: true, message: "Valid email required" }]}
        >
          <Input placeholder="Enter email" />
        </Form.Item>

        <Form.Item
          label="Phone"
          name="phone"
          rules={[{ required: true, message: "Phone number is required" }]}
        >
          <Input placeholder="Enter phone number" />
        </Form.Item>

        <Form.Item
          label="Grade"
          name="grade"
          rules={[{ required: true, message: "Grade is required" }]}
        >
          {loadingGrades ? (
            <Spin />
          ) : (
            <Select placeholder="Select grade">
              {gradeOptions.map((grade) => (
                <Option key={grade.id} value={grade.class_name}>
                  {grade.class_name}
                </Option>
              ))}
            </Select>
          )}
        </Form.Item>

        <Form.Item
          label="Subjects"
          name="subjects"
          rules={[{ required: true, message: "At least one subject required" }]}
        >
          {loadingSubjects ? (
            <Spin />
          ) : (
            <Select mode="tags" placeholder="Select subjects">
              {subjectOptions.map((subject) => (
                <Option key={subject.id} value={subject.subject_name}>
                  {subject.subject_name}
                </Option>
              ))}
            </Select>
          )}
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: "Status is required" }]}
        >
          {loadingStatus ? (
            <Spin />
          ) : (
            <Select placeholder="Select status">
              {statusOptions.map((status) => (
                <Option key={status} value={status}>
                  <Tag
                    color={
                      status === "Active"
                        ? "green"
                        : status === "Inactive"
                        ? "red"
                        : status === "Pending"
                        ? "gold"
                        : status === "Approved"
                        ? "blue"
                        : status === "Rejected"
                        ? "volcano"
                        : "default"
                    }
                  >
                    {status}
                  </Tag>
                </Option>
              ))}
            </Select>
          )}
        </Form.Item>
      </Form>
    </Drawer>
  );
}
