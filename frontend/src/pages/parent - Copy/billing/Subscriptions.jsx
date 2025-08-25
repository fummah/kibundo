// src/pages/parent/OnboardingAddStudent.jsx
import { useState } from "react";
import { Form, Input, Select, Button, Card, Typography, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const { Title, Text } = Typography;
const { Option } = Select;

export default function OnboardingAddStudent() {
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      // Replace with your API call
      console.log("Submitting student:", values);
      message.success(`Student "${values.name}" added successfully`);
    } catch (err) {
      console.error(err);
      message.error("Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientShell pad={false}>
      {/* Mobile top bar */}
      <div className="mobile-only">
        <TopBar title="Add Student" showBack />
      </div>

      <div className="px-5 md:px-8 py-6 md:py-10 max-w-2xl mx-auto w-full">
        <Card
          className="rounded-2xl shadow-md border-0"
          styles={{ body: { padding: 24 } }}
        >
          <Title level={4} className="!mb-1">
            Add a New Student
          </Title>
          <Text type="secondary">
            Fill in your child’s details to set up their learning profile.
          </Text>

          <Form
            layout="vertical"
            onFinish={handleFinish}
            className="mt-5"
            autoComplete="off"
          >
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: "Please enter the student’s name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Enter student’s name" />
            </Form.Item>

            <Form.Item
              label="Grade"
              name="grade"
              rules={[{ required: true, message: "Please select grade" }]}
            >
              <Select placeholder="Select grade">
                <Option value="Grade 1">Grade 1</Option>
                <Option value="Grade 2">Grade 2</Option>
                <Option value="Grade 3">Grade 3</Option>
                <Option value="Grade 4">Grade 4</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Email (optional)"
              name="email"
              rules={[{ type: "email", message: "Enter a valid email" }]}
            >
              <Input placeholder="student@email.com" />
            </Form.Item>

            <Form.Item className="!mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full rounded-full bg-[#C7D425] border-none text-black hover:!bg-[#b8c61d]"
              >
                Add Student
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-only">
        <BottomNav />
      </div>
    </GradientShell>
  );
}
