import React, { useEffect } from "react";
import { Button, Card, DatePicker, Form, Input, Select, Space, message } from "antd";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader.jsx";
import { createPost, updatePost, listPosts } from "./_api";

function useQueryParam(name) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(name);
}

export default function PublishBlogPost() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const postId = useQueryParam("id");

  const { data } = useQuery({
    queryKey: ["post", postId],
    enabled: !!postId,
    queryFn: async () => {
      const res = await listPosts({ id: postId });
      return (res?.items || [])[0];
    }
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        title: data.title, slug: data.slug, audience: data.audience || "parents",
        status: data.status || "draft", tags: data.tags || [],
        content: data.content || "", seo_title: data.seo_title, seo_description: data.seo_description,
        scheduled_for: data.scheduled_for ? dayjs(data.scheduled_for) : null
      });
    }
  }, [data, form]);

  const createMut = useMutation({
    mutationFn: (payload) => createPost(payload),
    onSuccess: (r) => { message.success("Post created"); qc.invalidateQueries({ queryKey: ["posts"] }); navigate(`/admin/content/publish?id=${r.id}`); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updatePost(postId, payload),
    onSuccess: () => { message.success("Post updated"); qc.invalidateQueries({ queryKey: ["posts"] }); }
  });
  const onSubmit = async () => {
    const v = await form.validateFields();
    const payload = { ...v, scheduled_for: v.scheduled_for ? v.scheduled_for.toISOString() : null };
    if (postId) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title={postId ? "Edit Post" : "Publish Blog Post"} />
      <div className="p-3 md:p-4">
        <Card>
          <Form layout="vertical" form={form} initialValues={{ audience: "parents", status: "draft" }}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="slug" label="Slug" tooltip="If blank, it will be auto-generated"><Input /></Form.Item>

            <Form.Item name="audience" label="Audience">
              <Select options={["parents","teachers","both"].map(v=>({value:v,label:v}))} />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select options={["draft","scheduled","published"].map(v=>({value:v,label:v}))} />
            </Form.Item>
            <Form.Item name="scheduled_for" label="Schedule (optional)">
              <DatePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Press Enter to add" /></Form.Item>
            <Form.Item name="content" label="Content (Markdown / HTML)" rules={[{ required: true }]}>
              <Input.TextArea rows={12} placeholder="Write your post content…" />
            </Form.Item>

            <Form.Item label="SEO">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="seo_title" label="SEO Title"><Input /></Form.Item>
                <Form.Item name="seo_description" label="SEO Description"><Input /></Form.Item>
              </div>
            </Form.Item>

            <Space>
              <Button onClick={() => navigate(-1)}>Back</Button>
              <Button type="primary" loading={createMut.isPending || updateMut.isPending} onClick={onSubmit}>
                {postId ? "Save" : "Create"}
              </Button>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
}
