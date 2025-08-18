import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button, Card, Form, Input, Space, Grid, Skeleton,
} from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SaveOutlined } from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import { getSubject, createSubject, updateSubject } from "@/pages/academics/_api";

const { useBreakpoint } = Grid;

export default function SubjectForm() {
  const { id } = useParams();              // if present → edit mode
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEdit);

  // Quiet load for edit
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const subj = await getSubject(id).catch(() => null);
        if (!mounted) return;
        if (subj) {
          form.setFieldsValue({
            name: subj.name || "",
            code: subj.code || "",
            description: subj.description || "",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isEdit, form]);

  const createMut = useMutation({
    mutationFn: (payload) => createSubject(payload),
    onSuccess: (res) => {
      const newId = res?.id;
      navigate(newId ? `/admin/academics/subjects/${newId}` : "/admin/academics/subjects");
    },
    onError: () => { /* quiet */ }
  });

  const updateMut = useMutation({
    mutationFn: (payload) => updateSubject(id, payload),
    onSuccess: () => {
      navigate(`/admin/academics/subjects/${id}`);
    },
    onError: () => { /* quiet */ }
  });

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (isEdit) updateMut.mutate(values); else createMut.mutate(values);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title={isEdit ? "Edit Subject" : "New Subject"}
        subtitle="Define subject metadata used across academics."
        extra={
          <Space wrap>
            <Button onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />}
              loading={createMut.isPending || updateMut.isPending}
              onClick={onSubmit}
            >
              {isEdit ? "Save" : "Create"}
            </Button>
          </Space>
        }
      />

      <div className="p-3 md:p-4">
        <Card>
          {loading ? (
            <Skeleton active />
          ) : (
            <Form
              layout="vertical"
              form={form}
              initialValues={{ name: "", code: "", description: "" }}
              onFinish={onSubmit}
            >
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Please enter a subject name" }]}
              >
                <Input placeholder="e.g. Deutsch, Mathematik" />
              </Form.Item>

              <Form.Item
                name="code"
                label="Code"
                tooltip="A short unique code (letters or digits)"
                rules={[{ required: true, message: "Please enter a code" }]}
              >
                <Input placeholder="e.g. DE, MATH" />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={4} placeholder="Optional description…" />
              </Form.Item>

              <Space wrap>
                <Button onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}
                  loading={createMut.isPending || updateMut.isPending}
                >
                  {isEdit ? "Save" : "Create"}
                </Button>
              </Space>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
