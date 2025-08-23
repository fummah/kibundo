// src/pages/content/PublishBlogPost.jsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  Upload,
  Image,
} from "antd";
import {
  SaveOutlined,
  CheckOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  UploadOutlined,
  CloseCircleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { Title } = Typography;

const LS_SHADOW_KEY = "kibundo.blogPost.lastSaved.v1";

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

// Strip HTML for description snippets
const stripHtml = (html) =>
  (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

/** ---- Tiny wrapper to make ReactQuill play nicely with AntD Form ---- */
function RichTextArea({ value, onChange, onImageUpload }) {
  const quillRef = useRef(null);

  const handleImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const quill = quillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      try {
        const url = await onImageUpload(file); // must return a URL
        if (range) {
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1);
        }
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image", "blockquote", "code-block"],
          ["clean"],
        ],
        handlers: { image: handleImage },
      },
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "align",
    "link",
    "image",
    "blockquote",
    "code-block",
  ];

  return (
    <div className="antd-quill">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
      />
      <style>{`
        .antd-quill .ql-container { min-height: 260px; }
        .antd-quill .ql-toolbar, .antd-quill .ql-container { border-radius: 8px; }
      `}</style>
    </div>
  );
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

  const [thumbPreview, setThumbPreview] = useState("");

  const watchTitle = Form.useWatch("title", form);
  const watchBodyHtml = Form.useWatch("body_html", form);
  const watchThumb = Form.useWatch("thumbnail_url", form);

  // Keep local preview in sync (URL input or upload)
  useEffect(() => {
    setThumbPreview(watchThumb || "");
  }, [watchThumb]);

  // Auto-slug
  useEffect(() => {
    const t = form.getFieldValue("title");
    const s = form.getFieldValue("slug");
    if (!s || s === slugify(s)) form.setFieldsValue({ slug: slugify(t || "") });
  }, [watchTitle]); // eslint-disable-line react-hooks/exhaustive-deps

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
          body_html: post.body_html || post.body_md || "",
          audience: post.audience || "parents",
          status: post.status || "draft",
          tags: Array.isArray(post.tags) ? post.tags : [],
          seo: JSON.stringify(post.seo || {}, null, 2),
          scheduled_for: post.scheduled_for ? dayjs(post.scheduled_for) : null,
          published_at: post.published_at ? dayjs(post.published_at) : null,
          // NEW: thumbnail field
          thumbnail_url: post.thumbnail_url || post.thumbnail || "",
        });
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [editingId, form]);

  // Live Preview uses HTML directly
  const htmlPreview = useMemo(() => watchBodyHtml || "", [watchBodyHtml]);

  // Simple example uploader for images inside rich editor (replace with your API)
  const uploadImage = async (file) => {
    // const fd = new FormData(); fd.append("file", file);
    // const { data } = await api.post("/upload", fd);
    // return data.url;
    await new Promise((r) => setTimeout(r, 300));
    return URL.createObjectURL(file); // preview URL; replace in production
  };

  // Thumbnail uploader
  const handleThumbBeforeUpload = async (file) => {
    // Replace with real upload API; set returned URL to the form field
    const url = URL.createObjectURL(file);
    form.setFieldsValue({ thumbnail_url: url });
    setThumbPreview(url);
    message.success(`Thumbnail loaded: ${file.name}`);
    return false; // prevent auto upload
  };

  const clearThumbnail = () => {
    form.setFieldsValue({ thumbnail_url: "" });
    setThumbPreview("");
  };

  // Save or Publish
  const onSave = async (statusOverride) => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (!v.body_html || !stripHtml(v.body_html)) {
        return message.error("Post body cannot be blank");
      }

      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?.id) return message.error("No logged-in user found.");

      let seoJson = {};
      if (v.seo) {
        try {
          seoJson = JSON.parse(v.seo);
        } catch {
          seoJson = {};
          message.warning("Invalid SEO JSON, default will be used.");
        }
      }

      // Default SEO if blank
      if (!seoJson.title) seoJson.title = v.title || "Untitled Post";
      if (!seoJson.description) seoJson.description = stripHtml(v.body_html).slice(0, 160);
      // If missing image and we have a thumbnail, set it
      if (!seoJson.image && v.thumbnail_url) {
        seoJson.image = v.thumbnail_url;
        seoJson["og:image"] = v.thumbnail_url;
      }

      const payload = {
        title: v.title?.trim() || "-",
        slug: v.slug?.trim() || slugify(v.title || ""),
        body_html: v.body_html,       // Rich text HTML
        body_md: stripHtml(v.body_html),
        audience: v.audience || "parents",
        status: statusOverride || v.status || "draft",
        tags: v.tags || [],
        seo: seoJson,
        author_id: currentUser.id,
        created_by: currentUser.email || currentUser.name || "system",
        scheduled_for: v.scheduled_for ? v.scheduled_for.toISOString() : null,
        thumbnail_url: v.thumbnail_url || "",   // <-- NEW: send to backend
        ...(editingId ? { id: Number(editingId) } : {}),
      };

      const saved = await apiCreate(payload);
      try {
        localStorage.setItem(LS_SHADOW_KEY, JSON.stringify(saved));
      } catch {}

      if (!editingId) navigate(`/admin/content/publish?id=${saved.id}`);
      message.success(editingId ? "Post version updated" : "Post created");
    } finally {
      setSaving(false);
    }
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
          <Title level={3} className="!mb-0">
            {editingId ? "Edit Blog Post" : "Publish Blog Post"}
          </Title>
          {editingId && <Tag color="blue">ID: {editingId}</Tag>}
        </Space>
        <Space wrap>
          <Button onClick={() => navigate(-1)}>Back</Button>
          {editingId && (
            <Popconfirm title="Delete this post?" onConfirm={onDelete}>
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => onSave()}
            loading={saving}
          >
            Save Draft
          </Button>
          <Tooltip title="Sets status to published; backend sets published_at">
            <Button
              type="primary"
              ghost
              icon={<CheckOutlined />}
              onClick={() => onSave("published")}
              loading={saving}
            >
              Publish
            </Button>
          </Tooltip>
        </Space>
      </div>

      <Card className="rounded-2xl" loading={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            audience: "parents",
            status: "draft",
            tags: [],
            body_html: "",
            thumbnail_url: "",
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                className="rounded-xl"
                title="Content"
                extra={
                  <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOn(true)}>
                      Preview
                    </Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => setPreviewOn(false)}>
                      Edit
                    </Button>
                  </Space>
                }
              >
                <Form.Item
                  name="title"
                  label="Title"
                  rules={[{ required: true, message: "Please enter a title" }]}
                >
                  <Input placeholder="Post title" />
                </Form.Item>

                <Form.Item
                  name="slug"
                  label="Slug"
                  tooltip="Auto-generated from title"
                  rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}
                >
                  <Input placeholder="e.g., how-to-study-math" />
                </Form.Item>

                {/* RICH TEXT EDITOR */}
                <Form.Item
                  name="body_html"
                  label="Body (Rich Text)"
                  rules={[{ required: true, message: "Post body cannot be blank" }]}
                  valuePropName="value"
                  getValueFromEvent={(v) => v}
                >
                  <RichTextArea
                    value={Form.useWatch("body_html", form)}
                    onChange={(html) => form.setFieldsValue({ body_html: html })}
                    onImageUpload={uploadImage}
                  />
                </Form.Item>

                {previewOn && (
                  <>
                    <Divider />
                    <Title level={5} className="!mb-2">
                      Live Preview (HTML)
                    </Title>
                    <div
                      className="prose max-w-none border rounded-lg p-4 bg-white"
                      dangerouslySetInnerHTML={{
                        __html: htmlPreview || "<p>-</p>",
                      }}
                    />
                  </>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Space direction="vertical" size="large" className="w-full">
                <Card className="rounded-xl" title="Metadata">
                  <Form.Item name="audience" label="Audience">
                    <Select
                      options={[
                        { value: "parents", label: "Parents" },
                        { value: "teachers", label: "Teachers" },
                        { value: "both", label: "Both" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="status" label="Workflow Status">
                    <Select
                      options={[
                        { value: "draft", label: "Draft" },
                        { value: "pending_review", label: "Pending review" },
                        { value: "published", label: "Published" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="tags" label="Tags">
                    <Select mode="tags" tokenSeparators={[","]} placeholder="Add tags" />
                  </Form.Item>
                  <Form.Item
                    name="seo"
                    label="SEO (JSON)"
                    tooltip='Optional JSON like {"title":"...","description":"...","image":"..."}'
                  >
                    <Input.TextArea autoSize={{ minRows: 6, maxRows: 16 }} placeholder="{ }" />
                  </Form.Item>
                  <Form.Item
                    name="scheduled_for"
                    label="Scheduled for"
                    tooltip="Optional date/time for scheduled publish"
                  >
                    <DatePicker showTime className="w-full" />
                  </Form.Item>
                  <Form.Item name="published_at" label="Published at">
                    <DatePicker
                      showTime
                      className="w-full"
                      disabled
                      placeholder="Set by server on publish"
                    />
                  </Form.Item>
                </Card>

                {/* NEW: Thumbnail for overview */}
                <Card
                  className="rounded-xl"
                  title="Thumbnail (Overview Card)"
                  extra={
                    thumbPreview ? (
                      <Button type="text" icon={<CloseCircleFilled />} onClick={clearThumbnail}>
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  <Form.Item
                    name="thumbnail_url"
                    label="Thumbnail URL"
                    tooltip="Shown on blog overview cards (recommended 1200×630). You can paste a URL or upload below."
                  >
                    <Input
                      placeholder="https://…/image.jpg"
                      onBlur={(e) => setThumbPreview(e.target.value || "")}
                      allowClear
                    />
                  </Form.Item>

                  <Upload.Dragger
                    multiple={false}
                    accept="image/*"
                    beforeUpload={handleThumbBeforeUpload}
                    showUploadList={false}
                    className="!p-4"
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag image to upload</p>
                    <p className="ant-upload-hint">PNG/JPG/WebP. We’ll store the URL in the form.</p>
                  </Upload.Dragger>

                  {thumbPreview ? (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Preview</div>
                      <div className="border rounded-lg overflow-hidden">
                        <Image
                          src={thumbPreview}
                          alt="Thumbnail preview"
                          width="100%"
                          style={{ maxHeight: 220, objectFit: "cover" }}
                          preview={false}
                        />
                      </div>
                    </div>
                  ) : null}
                </Card>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}
