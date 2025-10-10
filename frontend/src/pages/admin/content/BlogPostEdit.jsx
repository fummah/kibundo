// src/pages/admin/content/BlogPostEdit.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Card, Form, Input, Select, DatePicker, Button, Space, Typography,
  Row, Col, Divider, message, Tag, Tooltip, Popconfirm, Upload, Image
} from "antd";
import {
  SaveOutlined, CheckOutlined, ReloadOutlined, EyeOutlined,
  DeleteOutlined, UploadOutlined, CloseCircleFilled
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { Title } = Typography;
const LS_SHADOW_KEY = "kibundo.blogPost.lastSaved.v1";

/* ---------------- StrictMode-safe Quill wrapper (Quill 2) ---------------- */
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
      try {
        const url = await onImageUpload(file); // must return a URL
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        editor.insertEmbed(index, "image", url, "user");
        editor.setSelection(index + 1);
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
    "header","bold","italic","underline","strike","color","background",
    "list","bullet","align","link","image","blockquote","code-block",
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

/* ------------------------------ helpers ------------------------------ */
const slugify = (s) =>
  (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);

const stripHtml = (html) =>
  (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isNumericId = (v) => /^\d+$/.test(String(v || "").trim());
const toIsoOrNull = (d) => {
  if (!d) return null;
  try {
    return dayjs.isDayjs(d) ? d.toDate().toISOString() : new Date(d).toISOString();
  } catch { return null; }
};

const buildCorePayload = (v, currentUser, statusOverride) => ({
  title: (v.title || "-").trim(),
  slug: (v.slug || slugify(v.title || "-")).trim(),
  body_html: v.body_html || "",
  body_md: stripHtml(v.body_html || ""),
  audience: v.audience || "parents",
  status: statusOverride || v.status || "draft",
  tags: Array.isArray(v.tags) ? v.tags : [],
  seo: v.seo, // will normalize below
  author_id: currentUser.id,
  created_by: currentUser.email || currentUser.name || "system",
  scheduled_for: toIsoOrNull(v.scheduled_for),
});

// Get all existing slugs then generate a unique one
async function ensureUniqueSlug(baseSlug, editingId) {
  const safe = baseSlug && baseSlug.trim() ? baseSlug.trim() : "post";
  let wanted = slugify(safe);
  try {
    const { data } = await api.get("/blogposts", { withCredentials: true });
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    const existing = new Set(
      list
        .filter((p) => !editingId || String(p.id) !== String(editingId))
        .map((p) => String(p.slug || "").trim().toLowerCase())
    );

    if (!existing.has(wanted)) return wanted;

    // try -2, -3, ...
    let i = 2;
    while (existing.has(`${wanted}-${i}`) && i < 10_000) i += 1;
    return `${wanted}-${i}`;
  } catch {
    // if listing fails, fall back to timestamp suffix
    return `${wanted}-${Date.now().toString().slice(-5)}`;
  }
}

/* ------------------------------- page ------------------------------- */
export default function BlogPostEdit() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useAuthContext();

  const routeId = params?.id ?? searchParams.get("id");
  const editingId = useMemo(() => {
    const v = String(routeId ?? "").trim();
    return v && v !== "undefined" && v !== "null" && isNumericId(v) ? Number(v) : null;
  }, [routeId]);

  const queryClient = useQueryClient();

  // Local UI state
  const [previewOn, setPreviewOn] = useState(true);
  const [thumbPreview, setThumbPreview] = useState("");
  const watchTitle = Form.useWatch("title", form);
  const watchBodyHtml = Form.useWatch("body_html", form);
  const watchThumb = Form.useWatch("thumbnail_url", form);

  useEffect(() => { setThumbPreview(watchThumb || ""); }, [watchThumb]);

  // Auto-slug whenever title changes
  useEffect(() => {
    const t = form.getFieldValue("title");
    const s = form.getFieldValue("slug");
    if (!s || s === slugify(s)) form.setFieldsValue({ slug: slugify(t || "") });
  }, [watchTitle, form]);

  // Fetch existing (only when editing)
  const { data: fetchedPost, isFetching } = useQuery({
    queryKey: ["blogpost", editingId],
    queryFn: async () => {
      const { data } = await api.get(`/blogpost/${editingId}`);
      return data?.data ?? data ?? null;
    },
    enabled: editingId != null,
    staleTime: 30_000,
  });

  // Populate form when fetched
  useEffect(() => {
    if (!fetchedPost) return;
    form.setFieldsValue({
      title: fetchedPost.title || "",
      slug: fetchedPost.slug || "",
      body_html: fetchedPost.body_html || fetchedPost.body_md || "",
      audience: fetchedPost.audience || "parents",
      status: fetchedPost.status || "draft",
      tags: Array.isArray(fetchedPost.tags) ? fetchedPost.tags : [],
      seo: JSON.stringify(fetchedPost.seo || {}, null, 2),
      scheduled_for: fetchedPost.scheduled_for ? dayjs(fetchedPost.scheduled_for) : null,
      published_at: fetchedPost.published_at ? dayjs(fetchedPost.published_at) : null,
      thumbnail_url: fetchedPost.thumbnail_url || fetchedPost.thumbnail || "",
    });
  }, [fetchedPost, form]);

  /* -------- Mutations (create/update with unique-slug handling) -------- */
  const createOrUpdate = useMutation({
    mutationFn: async ({ payload, id }) => {
      const body = id ? { ...payload, id } : payload;

      // Try once
      try {
        const { data } = await api.post(`/addblogpost`, body);
        return data?.data ?? data ?? body;
      } catch (err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code || err?.response?.data?.original?.code;
        const msg = err?.response?.data?.message || err?.message || "";

        // If slug collision slipped through (23505 or includes 'slug must be unique')
        if (status === 500 && (code === "23505" || /slug.*unique/i.test(String(msg)))) {
          const newSlug = `${body.slug}-${Date.now().toString().slice(-4)}`;
          const retry = { ...body, slug: newSlug };
          const { data: retryData } = await api.post(`/addblogpost`, retry);
          return retryData?.data ?? retryData ?? retry;
        }
        throw err;
      }
    },
    onSuccess: (saved) => {
      try { localStorage.setItem(LS_SHADOW_KEY, JSON.stringify(saved)); } catch {}
      // Update the form slug to what was persisted (esp. after a retry rename)
      if (saved?.slug) {
        form.setFieldsValue({ slug: saved.slug });
      }

      if (!editingId) {
        const newId = Number(saved?.id);
        if (Number.isFinite(newId)) {
          navigate(`/admin/content/edit/${newId}`, { replace: true });
        } else {
          messageApi.warning("Saved, but no valid ID returned from server.");
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["blogpost", editingId] });
      }
    },
    onError: (err) => {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message;
      console.error("Save failed:", serverMsg);
      messageApi.error(`Save failed: ${serverMsg || "Server error"}`);
    },
  });

  // delete
  const destroy = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/blogpost/${id}`);
      return true;
    },
    onSuccess: () => {
      try {
        const raw = localStorage.getItem(LS_SHADOW_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && String(parsed.id) === String(editingId)) {
          localStorage.removeItem(LS_SHADOW_KEY);
        }
      } catch {}
      messageApi.success("Post deleted");
      navigate("/admin/content");
    },
    onError: () => messageApi.error("Failed to delete"),
  });

  // editor image upload (mock)
  const uploadImage = async (file) => {
    await new Promise((r) => setTimeout(r, 300));
    return URL.createObjectURL(file);
  };

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

  // Save / Publish with pre-check for slug uniqueness
  const onSave = async (statusOverride) => {
    try {
      const v = await form.validateFields();
      if (!v.body_html || !stripHtml(v.body_html)) {
        messageApi.error("Post body cannot be blank");
        return;
      }

      const currentUser = user;
      if (!currentUser?.id) {
        messageApi.error("No logged-in user found.");
        return;
      }

      // Normalize SEO: textarea string -> object when possible
      let seoVal = v.seo;
      if (typeof seoVal === "string" && seoVal.trim()) {
        try { seoVal = JSON.parse(seoVal); } catch { /* keep string */ }
      }
      const vFixed = { ...v, seo: seoVal };

      // Base payload
      let payload = buildCorePayload(vFixed, currentUser, statusOverride);

      // SEO defaults
      if (!payload.seo || (typeof payload.seo === "string" && !payload.seo.trim())) {
        const fallbackSeo = {
          title: vFixed.title || "Untitled Post",
          description: stripHtml(vFixed.body_html).slice(0, 160),
        };
        payload.seo = fallbackSeo;
      } else if (typeof payload.seo === "object") {
        if (!payload.seo.title) payload.seo.title = vFixed.title || "Untitled Post";
        if (!payload.seo.description) payload.seo.description = stripHtml(vFixed.body_html).slice(0, 160);
      }

      // Include thumbnail_url initially (server can ignore)
      if (vFixed.thumbnail_url) payload.thumbnail_url = vFixed.thumbnail_url;

      // Ensure slug is unique (create OR when user edited the slug)
      const userSlug = (v.slug || "").trim();
      const effectiveBase = userSlug || slugify(v.title || "post");
      const unique = await ensureUniqueSlug(effectiveBase, editingId);
      if (unique !== payload.slug) {
        payload.slug = unique;
        form.setFieldsValue({ slug: unique });
      }

      await createOrUpdate.mutateAsync({ payload, id: editingId || undefined });
      messageApi.success(editingId ? "Post updated" : "Post created");
    } catch {
      // antd validation errors are expected
    }
  };

  const onDelete = () => {
    if (!editingId) return;
    destroy.mutate(editingId);
  };

  const saving = createOrUpdate.isPending;
  const loading = editingId ? isFetching : false;
  const htmlPreview = useMemo(() => watchBodyHtml || "", [watchBodyHtml]);

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      {contextHolder}
      <div className="flex items-center justify-between mb-3">
        <Space wrap>
          <Title level={3} className="!mb-0">
            {editingId ? "Edit Blog Post" : "Create Blog Post"}
          </Title>
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
          <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave()} loading={saving}>
            Save Draft
          </Button>
          <Tooltip title="Sets status to published; backend sets published_at">
            <Button type="primary" ghost icon={<CheckOutlined />} onClick={() => onSave("published")} loading={saving}>
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
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewOn(true)}>Preview</Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => setPreviewOn(false)}>Edit</Button>
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
                  tooltip="Auto-generated from title; must be unique"
                  rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}
                >
                  <Input placeholder="e.g., how-to-study-math" />
                </Form.Item>

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
                    onImageUpload={async (file) => {
                      await new Promise((r) => setTimeout(r, 300));
                      return URL.createObjectURL(file);
                    }}
                  />
                </Form.Item>

                {previewOn && (
                  <>
                    <Divider />
                    <Title level={5} className="!mb-2">Live Preview (HTML)</Title>
                    <div
                      className="prose max-w-none border rounded-lg p-4 bg-white"
                      dangerouslySetInnerHTML={{ __html: htmlPreview || "<p>-</p>" }}
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
                    <DatePicker showTime className="w-full" disabled placeholder="Set by server on publish" />
                  </Form.Item>
                </Card>

                <Card
                  className="rounded-xl"
                  title="Thumbnail (Overview Card)"
                  extra={
                    thumbPreview ? (
                      <Button type="text" icon={<CloseCircleFilled />} onClick={clearThumbnail}>Remove</Button>
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
                    beforeUpload={async (file) => {
                      const url = URL.createObjectURL(file);
                      form.setFieldsValue({ thumbnail_url: url });
                      setThumbPreview(url);
                      message.success(`Thumbnail loaded: ${file.name}`);
                      return false;
                    }}
                    showUploadList={false}
                    className="!p-4"
                  >
                    <p className="ant-upload-drag-icon"><UploadOutlined /></p>
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
