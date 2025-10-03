// src/pages/admin/school/AddSchoolDrawer.jsx
import { Drawer, Form, Input, Select, Button, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Option } = Select;

export default function AddSchoolDrawer({ open, onClose, onAdd }) {
  const [form] = Form.useForm();

  const generateSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleFinish = (values) => {
    const newSchool = {
      ...values,
      slug: generateSlug(values.name),
      logo: "https://placehold.co/100x100", // replace with upload result later
    };
    onAdd(newSchool);
    form.resetFields();
    onClose();
  };

  return (
    <Drawer
      title="Add New School"
      width={400}
      onClose={onClose}
      open={open}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} onFinish={handleFinish}>
        <Form.Item name="name" label="School Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Green Valley High" />
        </Form.Item>

        <Form.Item name="location" label="Location" rules={[{ required: true }]}>
          <Input placeholder="e.g. Cape Town" />
        </Form.Item>

        <Form.Item name="type" label="School Type" rules={[{ required: true }]}>
          <Select placeholder="Select type">
            <Option value="Public">Public</Option>
            <Option value="Private">Private</Option>
          </Select>
        </Form.Item>

        <Form.Item name="category" label="School Category" rules={[{ required: true }]}>
          <Select placeholder="Select category">
            <Option value="Primary">Primary</Option>
            <Option value="Secondary">Secondary</Option>
          </Select>
        </Form.Item>

        <Form.Item name="students" label="Number of Students">
          <Input type="number" />
        </Form.Item>

        <Form.Item name="teachers" label="Number of Teachers">
          <Input type="number" />
        </Form.Item>

        <Form.Item label="Upload Logo">
          <Upload.Dragger name="logo" customRequest={({ onSuccess }) => setTimeout(onSuccess, 0)}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p>Click or drag logo file</p>
          </Upload.Dragger>
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Add School
        </Button>
      </Form>
    </Drawer>
  );
}
