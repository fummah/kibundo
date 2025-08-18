import React, { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Select, Space, message, Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import PageHeader from "@/components/PageHeader.jsx";
import api from "@/api/axios";

const STATUS_OPTS = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function TaskForm() {
  const [form] = Form.useForm();
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Load task when editing
  const { data, isFetching } = useQuery({
    queryKey: ["task", id],
    enabled: isEdit,
    queryFn: async () => {
      const res = await api.get(`/tasks/${id}`);
      // Accept {data:{...}} or direct payload
      return res?.data?.data ?? res?.data ?? {};
    },
  });

  // Populate form when data arrives
  useEffect(() => {
    if (!isEdit || !data) return;
    form.setFieldsValue({
      title: data.title ?? "",
      description: data.description ?? "",
      status: data.status ?? "todo",
      priority: data.priority ?? "normal",
      assignee_id: data.assignee_id ?? "",
      assignee_name: data.assignee_name ?? data.assignee ?? "",
      due_at: data.due_at ? dayjs(data.due_at) : null,
    });
  }, [data, isEdit, form]);

  const onSubmit = async () => {
    const v = await form.validateFields();
    const payload = {
      title: v.title?.trim() || "",
      description: v.description || "",
      status: v.status || "todo",
      priority: v.priority || "normal",
      assignee_id: v.assignee_id || "",
      assignee_name: v.assignee_name || "",
      due_at: v.due_at ? v.due_at.toISOString() : null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/tasks/${id}`, payload);
        message.success("Task updated");
        navigate(`/admin/tasks/${id}`);
      } else {
        const res = await api.post(`/tasks`, payload);
        const created = res?.data?.data ?? res?.data ?? {};
        message.success("Task created");
        // go to detail if we get an ID, else back to list
        if (created?.id) navigate(`/admin/tasks/${created.id}`);
        else navigate("/admin/tasks");
      }
    } catch (e) {
      // graceful failure (don’t throw to UI)
      message.error("Could not save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title={isEdit ? "Edit Task" : "New Task"} />
      <div className="p-3 md:p-4">
        <Card>
          {isEdit && isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Spin />
            </div>
          ) : (
            <Form
              layout="vertical"
              form={form}
              initialValues={{ status: "todo", priority: "normal" }}
            >
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: "Please enter a title" }]}
              >
                <Input placeholder="e.g. Prepare newsletter segment" />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={6} placeholder="Optional details…" />
              </Form.Item>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="assignee_id" label="Assignee ID">
                  <Input placeholder="e.g. user id" />
                </Form.Item>
                <Form.Item name="assignee_name" label="Assignee Name">
                  <Input placeholder="e.g. Jane Doe" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Form.Item name="due_at" label="Due Date">
                  <DatePicker showTime className="w-full" />
                </Form.Item>
                <Form.Item name="status" label="Status">
                  <Select options={STATUS_OPTS} />
                </Form.Item>
                <Form.Item name="priority" label="Priority">
                  <Select options={PRIORITY_OPTS} />
                </Form.Item>
              </div>

              <Space>
                <Button onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="primary" loading={saving} onClick={onSubmit}>
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
