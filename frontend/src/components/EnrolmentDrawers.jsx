// src/components/EnrolmentDrawers.jsx
import { Drawer, Descriptions, Form, Input, Select, Button, message } from "antd";
import { useEffect } from "react";
import axios from "axios";

const { Option } = Select;

export default function EnrolmentDrawers({ mode, data, onClose, role, refresh }) {
  const [form] = Form.useForm();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  useEffect(() => {
    if (isEdit && data) form.setFieldsValue(data);
  }, [data]);

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        await axios.put(`/api/${role}s/${data.id}`, values);
        message.success("Updated successfully");
      } else {
        await axios.post(`/api/${role}s`, values);
        message.success("Added successfully");
      }
      onClose();
      refresh();
    } catch {
      message.error("Failed to save");
    }
  };

  return (
    <Drawer
      title={isView ? "View Details" : isEdit ? "Edit" : "Add"}
      open={!!mode}
      onClose={onClose}
      width={500}
    >
      {isView ? (
        <Descriptions column={1}>
          <Descriptions.Item label="Name">{data?.firstName} {data?.lastName}</Descriptions.Item>
          <Descriptions.Item label="Email">{data?.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{data?.phone}</Descriptions.Item>
          <Descriptions.Item label="Grade">{data?.grade}</Descriptions.Item>
          <Descriptions.Item label="Subjects">{data?.subjects?.join(", ")}</Descriptions.Item>
          <Descriptions.Item label="Status">{data?.status}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="grade" label="Grade"><Input /></Form.Item>
          <Form.Item name="subjects" label="Subjects"><Select mode="tags" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit">Save</Button></Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
