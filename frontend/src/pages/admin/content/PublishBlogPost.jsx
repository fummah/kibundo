// src/pages/content/PublishBlogPost.jsx
import { useEffect, useMemo, useState, useRef, forwardRef } from "react";
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
  Empty,
} from "antd";
import {
  SaveOutlined,
  CheckOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  UploadOutlined,
  CloseCircleFilled,
  ArrowLeftOutlined,
  TagOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

import ReactQuill from "react-quill"; // ✅ ReactQuill v2
import "react-quill/dist/quill.snow.css";

const { Title, Paragraph, Text } = Typography;

const LS_SHADOW_KEY = "kibundo.blogPost.lastSaved.v1";

// ---------- helpers ----------
const isNumericId = (v) => /^\d+$/.test(String(v || "").trim());

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
  if (!id || id === "undefined" || id === "null" || !isNumericId(id)) return null;

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
  if (!id || !isNumericId(id)) return true;
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

/** ---- ReactQuill v2 wrapper (no findDOMNode) ---- */
const RichTextArea = forwardRef(function RichTextArea(
  { value, onChange, onImageUpload, placeholder = "Write something..." },
  ref
) {
  const quillRef = useRef(null);

  // expose the editor to parent if needed
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref(quillRef.current);
    } else {
      ref.current = quillRef.current;
    }
  }, [ref]);

  const handleImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const quill = quillRef.current?.getEditor?.();
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
        ref={quillRef} // ✅ real ref directly to the component
        theme="snow"
        value={value || ""}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style>{`
        .antd-quill .ql-container { min-height: 260px; }
        .antd-quill .ql-toolbar, .antd-quill .ql-container { border-radius: 8px; }
      `}</style>
    </div>
  );
});

/** ---- Simple in-page Blog preview (no external imports) ----
 *  Renders a clean preview using current form values.
 */
function BlogPreviewCard({ values }) {
  const {
    title,
    subtitle,
    body_html,
    tags = [],
    thumbnail_url,
  } = values || {};

  const hasBody = !!stripHtml(body_html || "");
  const hasHero = !!thumbnail_url;

  return (
    <Card bordered={false} className="rounded-2xl">
      {/* Header: Back + Share (dummy for now) */}
      <div className="flex items-center justify-between mb-4">
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />}>Back</Button>
        </Space>
        <Space>
          <Tooltip title="Share">
            <Button type="primary" icon={<EyeOutlined />}>Share</Button>
          </Tooltip>
        </Space>
      </div>

      {/* Hero */}
      {hasHero && (
        <Card
          styles={{ body: { padding: 0 } }}
          bordered={false}
          className="overflow-hidden rounded-2xl shadow-sm mb-6"
          cover={<img src={thumbnail_url} alt={title} className="w-full object-cover max-h-[420px]" />}
        />
      )}

      {/* Title + subtitle + tags */}
      <div className="max-w-3xl">
        <Title level={1} className="!mb-2 leading-tight">{title || "Untitled post"}</Title>
        {subtitle ? <Paragraph className="text-lg text-gray-600 !mt-0">{subtitle}</Paragraph> : null}

        <div className="mt-3">
          <Space size={[8,8]} wrap>
            {Array.isArray(tags) && tags.length > 0
              ? tags.map((t) => (
                  <Tag key={t} icon={<TagOutlined />} className="rounded-full px-2">
                    {t}
                  </Tag>
                ))
              : <Text type="secondary">No tags</Text>
            }
          </Space>
        </div>
      </div>

      <Divider className="my-6" />

      {/* Body */}
      {hasBody ? (
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: body_html }} />
        </div>
      ) : (
        <Empty description="Nothing to preview yet. Add content in the editor." />
      )}
    </Card>
  );
}

// -------------------- Component --------------------
export default function PublishBlogPost() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();

  const rawId = params.get("id");
  const editingId =
    rawId && rawId !== "undefined" && rawId !== "null" && isNumericId(rawId)
      ? rawId
      : null;

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);

  const [thumbPreview, setThumbPreview] = useState("");

  // ✅ All hooks at top-level (no conditional calls)
  const watchTitle = Form.useWatch("title", form);
  const watchBodyHtml = Form.useWatch("body_html", form);
  const watchThumb = Form.useWatch("thumbnail_url", form);
  const values = Form.useWatch([], form) || {};

  useEffect(() => {
    setThumbPreview(watchThumb || "");
  }, [watchThumb]);

  // Auto-slug
  useEffect(() => {
    const t = form.getFieldValue("title");
    const s = form.getFieldValue("slug");
    // only regenerate when slug is empty or matches its own slugified version (user hasn't customized)
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
          subtitle: post.subtitle || "",
          slug: post.slug || "",
          body_html: post.body_html || post.body_md || "",
          audience: post.audience || "parents",
          status: post.status || "draft",
          tags: Array.isArray(post.tags) ? post.tags : [],
          seo: JSON.stringify(post.seo || {}, null, 2),
          scheduled_for: post.scheduled_for ? dayjs(post.scheduled_for) : null,
          published_at: post.published_at ? dayjs(post.published_at) : null,
          thumbnail_url: post.thumbnail_url || post.thumbnail || "",
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [editingId, form]);

  const htmlPreview = useMemo(() => watchBodyHtml || "", [watchBodyHtml]);

  // Editor image upload (replace with real API)
  const uploadImage = async (file) => {
    await new Promise((r) => setTimeout(r, 300));
    return URL.createObjectURL(file);
  };

  // Thumbnail uploader
  const handleThumbBeforeUpload = async (file) => {
    const url = URL.createObjectURL(file);
    form.setFieldsValue({ thumbnail_url: url });
    setThumbPreview(url);
    messageApi.success(`Thumbnail loaded: ${file.name}`);
    return false;
  };

  const clearThumbnail = () => {
    form.setFieldsValue({ thumbnail_url: "" });
    setThumbPreview("");
  };

  // Save / Publish
  const onSave = async (statusOverride) => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (!v.body_html || !stripHtml(v.body_html)) {
        messageApi.error("Post body cannot be blank");
        return null;
      }

      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?.id) {
        messageApi.error("No logged-in user found.");
        return null;
      }

      let seoJson = {};
      if (v.seo) {
        try {
          seoJson = JSON.parse(v.seo);
        } catch {
          seoJson = {};
          messageApi.warning("Invalid SEO JSON, default will be used.");
        }
      }

      if (!seoJson.title) seoJson.title = v.title || "Untitled Post";
      if (!seoJson.description) seoJson.description = stripHtml(v.body_html).slice(0, 160);
      if (!seoJson.image && v.thumbnail_url) {
        seoJson.image = v.thumbnail_url;
        seoJson["og:image"] = v.thumbnail_url;
      }

      const payload = {
        title: v.title?.trim() || "-",
        subtitle: v.subtitle?.trim() || "",
        slug: v.slug?.trim() || slugify(v.title || ""),
        body_html: v.body_html,
        body_md: stripHtml(v.body_html),
        audience: v.audience || "parents",
        status: statusOverride || v.status || "draft",
        tags: v.tags || [],
        seo: seoJson,
        author_id: currentUser.id,
        created_by: currentUser.email || currentUser.name || "system",
        scheduled_for: v.scheduled_for ? v.scheduled_for.toISOString() : null,
        thumbnail_url: v.thumbnail_url || "",
        ...(editingId ? { id: Number(editingId) } : {}),
      };

      const saved = await apiCreate(payload);
      try { localStorage.setItem(LS_SHADOW_KEY, JSON.stringify(saved)); } catch {}

      if (!editingId) {
        const newId = Number(saved?.id);
        if (Number.isFinite(newId)) {
          navigate(`/admin/content/publish?id=${newId}`);
        } else {
          messageApi.warning("Saved, but no valid ID returned from server.");
        }
      }

      messageApi.success(editingId ? "Post version updated" : "Post created");
      return saved || null;
    } finally {
      setSaving(false);
    }
  };

  // Preview/public view
  const openPreviewOrPublic = async () => {
    const values = form.getFieldsValue(true);
    const localStatus = values?.status;
    const localSlug = (values?.slug || "").trim();

    if (editingId) {
      if (localStatus === "published" && localSlug) {
        window.open(`/blog/${localSlug}`, "_blank");
      } else {
        // ✅ match nested route in AdminRoutes.jsx
        window.open(`/admin/content/blog/preview/${editingId}`, "_blank");
      }
      return;
    }

    const saved = await onSave();
    if (!saved) return;

    const id = Number(saved?.id);
    const status = saved?.status || localStatus;
    const slug = (saved?.slug || localSlug || "").trim();

    if (Number.isFinite(id)) {
      if (status === "published" && slug) {
        window.open(`/blog/${slug}`, "_blank");
      } else {
        // ✅ match nested route in AdminRoutes.jsx
        window.open(`/admin/content/blog/preview/${id}`, "_blank");
      }
    } else {
      messageApi.error("Could not open preview: missing post ID.");
    }
  };

  const onDelete = async () => {
    if (!editingId) return;
    await apiDelete(editingId);
    messageApi.success("Post deleted");
    navigate("/admin/content");
  };

  // -------------------- Render --------------------
  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      {contextHolder}
      <div className="flex items-center justify-between mb-3">
        <Space wrap>
          <Title level={3} className="!mb-0">
            {editingId ? "Edit Blog Post" : "Publish Blog Post"}
          </Title>
          {editingId && <Tag color="blue">ID: {editingId}</Tag>}
        </Space>
        <Space wrap>
          <Button onClick={() => navigate(-1)}>Back</Button>

          <Tooltip title="Open a full-page preview (or public page if published)">
            <Button icon={<EyeOutlined />} onClick={openPreviewOrPublic}>
              Preview Post
            </Button>
          </Tooltip>

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
                    <Button
                      size="small"
                      type={previewOn ? "primary" : "default"}
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewOn(true)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="small"
                      type={!previewOn ? "primary" : "default"}
                      icon={<ReloadOutlined />}
                      onClick={() => setPreviewOn(false)}
                    >
                      Edit
                    </Button>
                  </Space>
                }
              >
                {!previewOn ? (
                  <>
                    <Form.Item
                      name="title"
                      label="Title"
                      rules={[{ required: true, message: "Please enter a title" }]}
                    >
                      <Input placeholder="Post title" />
                    </Form.Item>

                    <Form.Item name="subtitle" label="Subtitle">
                      <Input placeholder="Optional subtitle" />
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
  value={watchBodyHtml}
  onChange={(html) => form.setFieldsValue({ body_html: html })}
  onImageUpload={uploadImage}
/>

                    </Form.Item>
                  </>
                ) : (
                  <>
                    <Title level={5} className="!mb-2">
                      Live Preview
                    </Title>
                    <BlogPreviewCard values={values} />
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
                    <Input.TextArea
                      autoSize={{ minRows: 6, maxRows: 16 }}
                      placeholder="{ }"
                    />
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

                {/* Thumbnail for overview */}
                <Card
                  className="rounded-xl"
                  title="Thumbnail (Overview / Hero)"
                  extra={
                    thumbPreview ? (
                      <Button
                        type="text"
                        icon={<CloseCircleFilled />}
                        onClick={clearThumbnail}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  <Form.Item
                    name="thumbnail_url"
                    label="Image URL"
                    tooltip="Shown on blog overview and used as hero in preview (recommended 1200×630)."
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
                    <p className="ant-upload-hint">
                      PNG/JPG/WebP. We’ll store the URL in the form.
                    </p>
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

          {/* Inline quick HTML preview (kept, hidden when big preview is on) */}
          {!previewOn && (
            <>
              <Divider />
              <Title level={5} className="!mb-2">
                Quick HTML Preview
              </Title>
              {stripHtml(htmlPreview) ? (
                <div
                  className="prose max-w-none border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{
                    __html: htmlPreview,
                  }}
                />
              ) : (
                <Empty description="Nothing to preview yet. Add content in the editor." />
              )}
            </>
          )}
        </Form>
      </Card>
    </div>
  );
}
