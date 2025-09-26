// src/components/AddCommentForm.jsx
import React from 'react';
import { Form, Input, Button } from 'antd';

export default function AddCommentForm({ onSubmit }) {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    if (!values.text || !values.text.trim()) return;
    // In a real app, author would come from logged-in user context
    const payload = { author: 'Admin', text: values.text.trim() };
    onSubmit(payload);
    form.resetFields();
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item name="text" className="!mb-2">
          <Input.TextArea placeholder="Write a new note..." autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item className="!mb-0 text-right">
          <Button type="primary" htmlType="submit">
            Save Note
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
