// src/components/MapPickerModal.jsx
import { Modal, Form, Input, InputNumber, Space } from "antd";

export default function MapPickerModal({ open, onCancel, onOk, initial }) {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Pick location"
      open={open}
      onCancel={onCancel}
      okText="Use location"
      onOk={async () => {
        const vals = await form.validateFields();
        onOk(vals); // { label, lat, lng }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          label: initial?.label || "",
          lat: initial?.lat ?? undefined,
          lng: initial?.lng ?? undefined,
        }}
      >
        <Form.Item label="Label (address/place)" name="label" rules={[{ required: true, message: "Enter a label" }]}>
          <Input placeholder="e.g., Hauptstraße 10, 10115 Berlin" allowClear />
        </Form.Item>
        <Space.Compact block>
          <Form.Item label="Latitude" name="lat" rules={[{ required: true, message: "Lat required" }]} style={{ width: "50%" }}>
            <InputNumber placeholder="52.5200" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Longitude" name="lng" rules={[{ required: true, message: "Lng required" }]} style={{ width: "50%" }}>
            <InputNumber placeholder="13.4050" style={{ width: "100%" }} />
          </Form.Item>
        </Space.Compact>
      </Form>
    </Modal>
  );
}
