import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, Skeleton, Result, Button, message, Tag, Typography, Divider, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";

const { Title, Text, Paragraph } = Typography;

function isNumericId(val) {
  return typeof val === "number" || (typeof val === "string" && /^[0-9]+$/.test(val));
}

export default function BlogPreviewPage() {
  const { id, slug } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [sanitizedHTML, setSanitizedHTML] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        let postData = null;

        // 1) Try slug first (for SEO-friendly URLs)
        if (slug) {
          const decoded = decodeURIComponent(slug);
          try {
            const r = await api.get(`/blogposts`, { params: { slug: decoded } });
            // Handle different response structures
            const responseData = r?.data;
            let arr = [];
            if (Array.isArray(responseData)) {
              arr = responseData;
            } else if (Array.isArray(responseData?.results)) {
              arr = responseData.results;
            } else if (Array.isArray(responseData?.data)) {
              arr = responseData.data;
            }
            postData = arr[0] || null;
          } catch (e) {
            if (e?.response?.status !== 404) {
              console.error("Error fetching by slug:", e);
            }
          }
        }

        // 2) Fallback: by ID if slug didn't work
        if (!postData && id && isNumericId(id)) {
          try {
            const { data } = await api.get(`/blogpost/${id}`); // should return drafts
            postData = data?.data ?? data ?? null;
          } catch (e) {
            if (e?.response?.status !== 404) throw e;
          }
        }

        if (!alive) return;
        setPost(postData);
        
        // Sanitize HTML
        if (postData?.body_html) {
          try {
            const mod = await import("dompurify");
            const DOMPurify = mod.default || mod;
            setSanitizedHTML(DOMPurify.sanitize(postData.body_html));
          } catch {
            setSanitizedHTML(postData.body_html);
          }
        }
      } catch (e) {
        if (alive) {
          messageApi.error("Could not load post");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, slug, location.pathname, messageApi]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return dayjs(dateString).format("MMMM D, YYYY [at] h:mm A");
  };

  if (loading) {
    return <Card className="max-w-5xl mx-auto my-6 rounded-2xl"><Skeleton active paragraph={{ rows: 12 }} /></Card>;
  }

  if (!post) {
    return (
      <Result
        status="404"
        title="Post not found"
        subTitle="Draft might not exist or you don't have permission."
        extra={<Button onClick={() => nav(-1)}>Back</Button>}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {contextHolder}
      <Card className="rounded-2xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
            Back
          </Button>
        </div>

        {/* Blog Post Details */}
        <div className="space-y-6">
          {/* Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, i) => (
                <Tag key={`${tag}-${i}`} color="blue" className="rounded-full px-3 py-1">
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          {/* Title */}
          <Title level={1} className="!mb-2 !text-3xl md:!text-4xl leading-tight">
            {post.title || "Untitled Post"}
          </Title>

          {/* Subtitle */}
          {post.subtitle && (
            <Paragraph className="text-lg text-neutral-600 !mb-4">
              {post.subtitle}
            </Paragraph>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 border-b border-neutral-200 pb-4">
            {post.created_by && (
              <div className="flex items-center gap-1">
                <Text type="secondary" strong>Author:</Text>
                <Text type="secondary">{post.created_by}</Text>
              </div>
            )}
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Text type="secondary" strong>Published:</Text>
                <Text type="secondary">{formatDate(post.published_at)}</Text>
              </div>
            )}
            {post.audience && (
              <div className="flex items-center gap-1">
                <Text type="secondary" strong>Audience:</Text>
                <Text type="secondary" className="capitalize">{post.audience}</Text>
              </div>
            )}
            {post.status && (
              <div className="flex items-center gap-1">
                <Text type="secondary" strong>Status:</Text>
                <Tag color={post.status === "published" ? "green" : post.status === "draft" ? "orange" : "default"} className="m-0">
                  {post.status}
                </Tag>
              </div>
            )}
          </div>

          {/* Additional Dates */}
          <div className="text-xs text-neutral-400 space-y-1">
            {post.created_at && post.created_at !== post.published_at && (
              <div>Created: {formatDate(post.created_at)}</div>
            )}
            {post.updated_at && post.updated_at !== post.published_at && (
              <div>Last updated: {formatDate(post.updated_at)}</div>
            )}
            {post.scheduled_for && (
              <div>Scheduled for: {formatDate(post.scheduled_for)}</div>
            )}
          </div>

          <Divider />

          {/* Hero Image */}
          {post.thumbnail_url && (
            <div className="rounded-2xl overflow-hidden mb-6">
              <img
                src={post.thumbnail_url.startsWith("http") || post.thumbnail_url.startsWith("//")
                  ? post.thumbnail_url
                  : `${window.location.origin}${post.thumbnail_url.startsWith("/") ? "" : "/"}${post.thumbnail_url}`}
                alt={post.title || "Blog post image"}
                className="w-full max-h-[500px] object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          {/* Body Content */}
          {sanitizedHTML ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />
          ) : post.body_html ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />
          ) : (
            <Text type="secondary">No content available.</Text>
          )}

          {/* Additional Info */}
          {post.slug && (
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <Text type="secondary" className="text-xs">
                Slug: <code className="bg-neutral-100 px-2 py-1 rounded">{post.slug}</code>
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
