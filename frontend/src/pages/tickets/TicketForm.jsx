import React, { useEffect } from "react";
import { Button, Card, Form, Input, Select, Space, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader.jsx";
import { createTicket, getTicket, updateTicket } from "./_api";

export default function TicketForm() {
  const [form] = Form.useForm();
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id),
    enabled: isEdit
  });

  useEffect(() => {
    if (data && isEdit) {
      form.setFieldsValue({
        subject: data.subject, body: data.body, priority: data.priority || "normal",
        status: data.status || "open", tags: data.tags || []
      });
    }
  }, [data, isEdit, form]);

  const createMut = useMutation({
    mutationFn: (payload) => createTicket(payload),
    onSuccess: () => { message.success("Created"); qc.invalidateQueries({ queryKey: ["tickets"] }); navigate("/admin/tickets"); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateTicket(id, payload),
    onSuccess: () => { message.success("Updated"); qc.invalidateQueries({ queryKey: ["tickets"] }); navigate(`/admin/tickets/${id}`); }
  });
  const onSubmit = async () => {
    const values = await form.validateFields();
    if (isEdit) updateMut.mutate(values); else createMut.mutate(values);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title={isEdit ? "Edit Ticket" : "New Ticket"} />
      <div className="p-3 md:p-4">
        <Card>
          <Form layout="vertical" form={form} initialValues={{ priority: "normal", status: "open" }}>
            <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="body" label="Message" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select options={["low","normal","high","urgent"].map(v=>({value:v,label:v}))} />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select options={["open","pending","closed"].map(v=>({value:v,label:v}))} />
            </Form.Item>
            <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Press Enter to add" /></Form.Item>

            <Space>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="primary" loading={createMut.isPending || updateMut.isPending} onClick={onSubmit}>
                {isEdit ? "Save" : "Create"}
              </Button>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
}
