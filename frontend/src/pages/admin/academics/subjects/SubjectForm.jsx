import React, { useEffect, useState } from "react";
import { Button, Form, Input, Select, Space, Spin, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/api/axios";

/**
 * Props:
 * - classes?: array (optional; if not provided and used as a route, we'll fetch)
 * - initialValues?: { subject_name?, class_id?, created_by? }
 * - onSubmit?: (vals) => Promise|void   // if not provided, acts as a route page and calls API itself
 * - onCancel?: () => void
 */
export default function SubjectForm({ classes: classesProp, initialValues, onSubmit, onCancel }) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // when used as a route
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState(false);
  const [classes, setClasses] = useState(classesProp || []);

  useEffect(() => {
    const setup = async () => {
      if (!classesProp) {
        try {
          const { data } = await api.get("/allclasses");
          setClasses(Array.isArray(data) ? data : []);
        } catch {
          message.error("Failed to load classes.");
        }
      }

      if (onSubmit) {
        form.setFieldsValue({
          subject_name: "",
          class_id: undefined,
          ...initialValues,
        });
        setBootstrap(true);
        return;
      }

      // Standalone route usage
      if (id) {
        setLoading(true);
        try {
          const { data } = await api.get(`/subject/${id}`);
          form.setFieldsValue({
            subject_name: data?.subject_name ?? "",
            class_id: data?.class_id,
          });
        } catch {
          message.error("Failed to load subject.");
        } finally {
          setLoading(false);
          setBootstrap(true);
        }
      } else {
        form.setFieldsValue({ subject_name: "", class_id: undefined });
        setBootstrap(true);
      }
    };

    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, onSubmit]);

  const handleFinish = async (vals) => {
    if (onSubmit) return onSubmit(vals);

    try {
      setLoading(true);
      await api.post("/addsubject", id ? { id, ...vals } : vals);
      message.success(id ? "Subject updated." : "Subject added.");
      navigate("/admin/academics/subjects");
    } catch {
      message.error("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!bootstrap) return <Spin />;

  const classOptionLabel = (c) => c?.name || c?.class_name || c?.title || `Class #${c.id}`;

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="subject_name"
        label="Subject Name"
        rules={[{ required: true, message: "Please enter subject name" }]}
      >
        <Input placeholder="e.g., Mathematics" />
      </Form.Item>

      <Form.Item
        name="class_id"
        label="Class"
        rules={[{ required: true, message: "Select a class" }]}
      >
        <Select
          placeholder="Select class"
          options={classes.map((c) => ({ value: c.id, label: classOptionLabel(c) }))}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>

      <Space className="flex justify-end w-full">
        {onCancel ? (
          <Button onClick={onCancel}>Cancel</Button>
        ) : (
          <Button onClick={() => navigate(-1)}>Cancel</Button>
        )}
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Space>
    </Form>
  );
}
