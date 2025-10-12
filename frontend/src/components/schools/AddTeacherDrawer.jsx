import { useEffect, useState } from "react";
import { Drawer, Form, Input, Button, Select, Spin, message } from "antd";
import api from "../../api/axios";

const { Option } = Select;

export default function AddTeacherDrawer({ open, onClose, onAdd }) {
  const [form] = Form.useForm();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

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
      message.error("Failed to fetch class or subject data");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        first_name: values.firstName?.trim(),
        last_name: values.lastName?.trim(),
        email: values.email?.trim(),
        contact_number: values.phone?.replace(/\s/g, '') || null,
        class_id: values.grade, // class ID
        subjects: values.subjects || [], // subject IDs
      };
      onAdd(payload);
      form.resetFields();
      onClose();
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  return (
    <Drawer
      title="➕ Add Teacher"
      onClose={() => {
        form.resetFields();
        onClose();
      }}
      open={open}
      width={window.innerWidth < 768 ? "100%" : 480}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: "First name is required" }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: "Last name is required" }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email", message: "Valid email required" }]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[
              { required: true, message: "Phone number is required" },
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
              {classes.map((g) => (
                <Option key={g.id} value={g.id}>
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
                <Option key={s.id} value={s.id}>
                  {s.subject_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" block onClick={handleSubmit}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
