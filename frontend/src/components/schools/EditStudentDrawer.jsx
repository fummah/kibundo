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
  onSave, // must return axios response
}) {
  const [form] = Form.useForm();
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchStatusOptions = async () => {
    setLoadingStatus(true);
    try {
      //const res = await api.get("/student-status-options"); // ✅ Your endpoint for status list
      setStatusOptions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch statuses:", err);
      message.error("Could not load status options");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatusOptions();
    }
  }, [open]);

  useEffect(() => {
    if (student) {
      form.setFieldsValue({
        name: student.name,
        email: student.email,
        phone: student.phone,
        grade: student.grade,
        subjects: student.subjects,
        status: student.status,
      });
    } else {
      form.resetFields();
    }
  }, [student, form]);

  const handleSubmit = () => {
    form
      .validateFields()
      .then(async (values) => {
        try {
          const res = await onSave?.(values); // expects response object

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
      })
      .catch(() => {
        message.error("Please fill all required fields");
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
          label="Name"
          name="name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="Enter name" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ type: "email", required: true, message: "Email required" }]}
        >
          <Input placeholder="Enter email" />
        </Form.Item>

        <Form.Item
          label="Phone"
          name="phone"
          rules={[
            { required: true, message: "Phone is required" },
            { 
              pattern: /^(\+49|0)[1-9]\d{1,14}$/, 
              message: "Please enter a valid German phone number (e.g., +49 30 12345678)" 
            }
          ]}
        >
          <Input placeholder="+49 30 12345678" />
        </Form.Item>

        <Form.Item
          label="Grade"
          name="grade"
          rules={[{ required: true, message: "Grade is required" }]}
        >
          <Select placeholder="Select grade">
            <Option value="Grade 4">Grade 4</Option>
            <Option value="Grade 5">Grade 5</Option>
            <Option value="Grade 6">Grade 6</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Subjects"
          name="subjects"
          rules={[{ required: true, message: "At least one subject required" }]}
        >
          <Select mode="tags" placeholder="Select subjects">
            <Option value="Math">Math</Option>
            <Option value="English">English</Option>
            <Option value="Science">Science</Option>
            <Option value="Life Skills">Life Skills</Option>
          </Select>
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
