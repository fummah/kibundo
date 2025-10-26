import React, { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, Select, Space, message, Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import PageHeader from "@/components/PageHeader.jsx";
import api from "@/api/axios";

const STATUS_OPTS = [
  { value: "todo", label: "Zu erledigen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "blocked", label: "Blockiert" },
  { value: "done", label: "Erledigt" },
];

const PRIORITY_OPTS = [
  { value: "low", label: "Niedrig" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Hoch" },
  { value: "urgent", label: "Dringend" },
];

export default function TaskForm() {
  const { t } = useTranslation();
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
        await api.put(`/api/tasks/${id}`, payload, { withCredentials: true });
        message.success("Aufgabe erfolgreich aktualisiert");
        navigate(`/admin/tasks/${id}`);
      } else {
        const res = await api.post(`/api/tasks`, payload, { withCredentials: true });
        const created = res?.data?.task ?? {};
        message.success("Aufgabe erfolgreich erstellt");
        // go to detail if we get an ID, else back to list
        if (created?.id) navigate(`/admin/tasks/${created.id}`);
        else navigate("/admin/tasks");
      }
    } catch (e) {
      // graceful failure (don't throw to UI)
      message.error("Aufgabe konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title={isEdit ? "Aufgabe bearbeiten" : "Neue Aufgabe"} />
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
                label="Titel"
                rules={[{ required: true, message: "Bitte geben Sie einen Titel ein" }]}
              >
                <Input placeholder="z. B. Newsletter-Segment vorbereiten" />
              </Form.Item>

              <Form.Item name="description" label="Beschreibung">
                <Input.TextArea rows={6} placeholder="Optionale Details..." />
              </Form.Item>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="assignee_id" label="Zugewiesen an (ID)">
                  <Input placeholder="z. B. Benutzer-ID" />
                </Form.Item>
                <Form.Item name="assignee_name" label="Zugewiesen an (Name)">
                  <Input placeholder="z. B. Max Mustermann" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Form.Item name="due_at" label="Fälligkeitsdatum">
                  <DatePicker showTime className="w-full" />
                </Form.Item>
                <Form.Item name="status" label="Status">
                  <Select options={STATUS_OPTS} />
                </Form.Item>
                <Form.Item name="priority" label="Priorität">
                  <Select options={PRIORITY_OPTS} />
                </Form.Item>
              </div>

              <Space>
                <Button onClick={() => navigate(-1)}>Abbrechen</Button>
                <Button type="primary" loading={saving} onClick={onSubmit}>
                  {isEdit ? "Aktualisieren" : "Erstellen"}
                </Button>
              </Space>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
