import { Form, Input, Button, Card, Switch } from "antd";

export default function SchoolSettings() {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log("Updated Settings:", values);
  };

  return (
    <Card title="⚙️ School Settings">
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ notifications: true }}>
        <Form.Item label="School Name" name="schoolName">
          <Input placeholder="Enter school name" />
        </Form.Item>

        <Form.Item label="Support Email" name="email">
          <Input type="email" placeholder="support@school.com" />
        </Form.Item>

        <Form.Item label="Enable Notifications" name="notifications" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">Update Settings</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
