// src/pages/content/PublishBlogPost.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  // Upload, // Commented out for now
} from "antd";
import { SaveOutlined, CheckOutlined, ReloadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
// const { Dragger } = Upload; // Image uploader commented

const LS_SHADOW_KEY = "kibundo.blogPost.lastSaved.v1";

// Syntax highlighting for Markdown
marked.setOptions({
  highlight: (code, lang) => {
    const validLang = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language: validLang }).value;
  },
});

// Auto-generate slug from title
const slugify = (s) =>
  (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);

// -------------------- API Wrappers --------------------
async function apiFetchOne(id) {
  try {
    const { data } = await api.get(`/blogpost/${id}`);
    return data?.data ?? data ?? null;
  } catch {
    const raw = localStorage.getItem(LS_SHADOW_KEY);
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && String(parsed.id) === String(id)) return parsed;
    } catch {}
    return null;
  }
}

async function apiCreate(payload) {
  try {
    const { data } = await api.post(`/addblogpost`, payload);
    return data?.data ?? data ?? payload;
  } catch {
    const fake = { id: Date.now(), ...payload };
    try {
      localStorage.setItem(LS_SHADOW_KEY, JSON.stringify(fake));
    } catch {}
    return fake;
  }
}

async function apiDelete(id) {
  try {
    await api.delete(`/blogpost/${id}`);
    return true;
  } catch {
    const raw = localStorage.getItem(LS_SHADOW_KEY);
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && String(parsed.id) === String(id))
        localStorage.removeItem(LS_SHADOW_KEY);
    } catch {}
    return true;
  }
}

// -------------------- Component --------------------
export default function PublishBlogPost() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id");

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);

  const watchTitle = Form.useWatch("title", form);
  const watchBody = Form.useWatch("body_md", form);

  // Auto-slug
  useEffect(() => {
    const t = form.getFieldValue("title");
    const s = form.getFieldValue("slug");
    if (!s || s === slugify(s)) form.setFieldsValue({ slug: slugify(t || "") });
  }, [watchTitle]);

  // Load existing post
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!editingId) return;
      setLoading(true);
      const post = await apiFetchOne(editingId);
      if (!alive) return;
      if (post) {
        form.setFieldsValue({
          title: post.title || "",
          slug: post.slug || "",
          body_md: post.body_md || "",
          audience: post.audience || "parents",
          status: post.status || "draft",
          tags: Array.isArray(post.tags) ? post.tags : [],
          seo: JSON.stringify(post.seo || {}, null, 2),
          scheduled_for: post.scheduled_for ? dayjs(post.scheduled_for) : null,
          published_at: post.published_at ? dayjs(post.published_at) : null,
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [editingId, form]);

  // Live HTML preview from Markdown
  const htmlPreview = useMemo(() => marked.parse(watchBody || ""), [watchBody]);

  // Save or Publish
  const onSave = async (statusOverride) => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (!v.body_md || !v.body_md.trim()) return message.error("Post body cannot be blank");

      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?.id) return message.error("No logged-in user found.");

      let seoJson = {};
      if (v.seo) {
        try { seoJson = JSON.parse(v.seo); } catch { seoJson = {}; message.warning("Invalid SEO JSON, default will be used."); }
      }

      // Default SEO if blank
      if (!seoJson.title) seoJson.title = v.title || "Untitled Post";
      if (!seoJson.description) seoJson.description = (v.body_md || "").substring(0, 160);

      const payload = {
        title: v.title?.trim() || "-",
        slug: v.slug?.trim() || slugify(v.title || ""),
        body_md: v.body_md,
        body_html: marked.parse(v.body_md),
        audience: v.audience || "parents",
        status: statusOverride || v.status || "draft",
        tags: v.tags || [],
        seo: seoJson,
        author_id: currentUser.id,
        created_by: currentUser.email || currentUser.name || "system",
        scheduled_for: v.scheduled_for ? v.scheduled_for.toISOString() : null,
        ...(editingId ? { id: Number(editingId) } : {}),
      };

      const saved = await apiCreate(payload);
      try { localStorage.setItem(LS_SHADOW_KEY, JSON.stringify(saved)); } catch {}

      if (!editingId) navigate(`/admin/content/publish?id=${saved.id}`);
      message.success(editingId ? "Post version updated" : "Post created");
    } finally { setSaving(false); }
  };

  // Delete post
  const onDelete = async () => {
    if (!editingId) return;
    await apiDelete(editingId);
    message.success("Post deleted");
    navigate("/admin/content");
  };

  // -------------------- Render --------------------
  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      <div className="flex items-center justify-between mb-3">
        <Space wrap>
          <Title level={3} className="!mb-0">{editingId ? "Edit Blog Post" : "Publish Blog Post"}</Title>
          {editingId && <Tag color="blue">ID: {editingId}</Tag>}
        </Space>
        <Space wrap>
          <Button onClick={() => navigate(-1)}>Back</Button>
          {editingId && (
            <Popconfirm title="Delete this post?" onConfirm={onDelete}>
              <Button danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>Reset</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave()} loading={saving}>Save Draft</Button>
          <Tooltip title="Sets status to published; backend sets published_at">
            <Button type="primary" ghost icon={<CheckOutlined />} onClick={() => onSave("published")} loading={saving}>Publish</Button>
          </Tooltip>
        </Space>
      </div>

      <Card className="rounded-2xl" loading={loading}>
        <Form form={form} layout="vertical" initialValues={{ audience: "parents", status: "draft", tags: [] }}>
          <Row gutter={[16,16]}>
            <Col xs={24} lg={14}>
              <Card className="rounded-xl" title="Content"
                extra={
                  <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOn(true)}>Preview</Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => setPreviewOn(false)}>Edit</Button>
                  </Space>
                }>
                <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title" }]}><Input placeholder="Post title" /></Form.Item>
                <Form.Item name="slug" label="Slug" tooltip="Auto-generated from title" rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}><Input placeholder="e.g., how-to-study-math" /></Form.Item>
                <Form.Item name="body_md" label="Body (Markdown)" rules={[{ required: true, message: "Post body cannot be blank" }]}><TextArea autoSize={{ minRows:10, maxRows:30 }} placeholder="Write your post in Markdown…" /></Form.Item>

                {/*
                <Dragger {...uploadProps} className="mb-3">
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Drag & drop an image here, or click to upload</p>
                </Dragger>
                */}

                {previewOn && <><Divider /><Title level={5} className="!mb-2">Live Preview (HTML)</Title>
                <div className="prose max-w-none dark:prose-invert border rounded-lg p-4 bg-white dark:bg-gray-900" dangerouslySetInnerHTML={{ __html: htmlPreview || "<p>-</p>" }} /></>}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card className="rounded-xl" title="Metadata">
                <Form.Item name="audience" label="Audience">
                  <Select options={[{ value:"parents", label:"Parents"},{value:"teachers",label:"Teachers"},{value:"both",label:"Both"}]} />
                </Form.Item>
                <Form.Item name="status" label="Workflow Status">
                  <Select options={[{ value:"draft", label:"Draft"},{value:"pending_review",label:"Pending review"},{value:"published",label:"Published"}]} />
                </Form.Item>
                <Form.Item name="tags" label="Tags"><Select mode="tags" tokenSeparators={[","]} placeholder="Add tags" /></Form.Item>
                <Form.Item name="seo" label="SEO (JSON)" tooltip='Optional JSON like {"title":"...","description":"..."}'><TextArea autoSize={{ minRows:6,maxRows:16 }} placeholder="{ }" /></Form.Item>
                <Form.Item name="scheduled_for" label="Scheduled for" tooltip="Optional date/time for scheduled publish"><DatePicker showTime className="w-full" /></Form.Item>
                <Form.Item name="published_at" label="Published at"><DatePicker showTime className="w-full" disabled placeholder="Set by server on publish" /></Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}
