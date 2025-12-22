// src/pages/parent/communications/NewsArticle.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Spin, Tag, Empty, Button, Typography, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import BottomTabBar from "@/components/parent/BottomTabBar";
import api from "@/api/axios";

const { Text, Title } = Typography;

export default function NewsArticle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [err, setErr] = useState(null);
  const [sanitizedHTML, setSanitizedHTML] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  // Normalize API shapes (images + content key)
  const normalize = (raw) => {
    if (!raw || typeof raw !== "object") return null;

    const cover_image =
      raw.cover_image || raw.image_url || raw.thumbnail_url || raw.image || null;
    const content = raw.content ?? raw.body_html ?? raw.body ?? "";

    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter(Boolean)
      : typeof raw.tags === "string"
      ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const published_at = raw.published_at || raw.created_at || raw.updated_at || null;
    const created_at = raw.created_at || null;
    const updated_at = raw.updated_at || null;
    const author = (raw.author || raw.author_name || raw.created_by || "").toString().trim();
    // Filter out "undefined" string
    const authorClean = author && author !== "undefined" && author !== "null" ? author : "";

    // Collect additional images for a gallery
    const imagesCandidates = [
      ...(Array.isArray(raw.images) ? raw.images : []),
      ...(Array.isArray(raw.gallery) ? raw.gallery : []),
      ...(raw.media?.images && Array.isArray(raw.media.images) ? raw.media.images : []),
      ...(Array.isArray(raw.attachments)
        ? raw.attachments
            .filter((a) => {
              const type = (a?.mime || a?.mimetype || a?.type || "").toLowerCase();
              const url = String(a?.url || a?.href || "");
              return type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url);
            })
            .map((a) => a.url || a.href)
        : []),
    ]
      .map((x) => (typeof x === "string" ? x : x?.url || x?.src || x?.image || null))
      .filter(Boolean);

    const gallery = uniq(imagesCandidates).filter((u) => u !== cover_image);

    // Clean all fields to avoid "undefined" strings
    const title = (raw.title || "").toString().trim();
    const titleClean = title && title !== "undefined" && title !== "null" ? title : "";
    const subtitle = (raw.subtitle || "").toString().trim();
    const subtitleClean = subtitle && subtitle !== "undefined" && subtitle !== "null" ? subtitle : "";
    const excerpt = (raw.excerpt || raw.summary || raw.subtitle || "").toString().trim();
    const excerptClean = excerpt && excerpt !== "undefined" && excerpt !== "null" ? excerpt : "";

    return { 
      ...raw, 
      title: titleClean || raw.title || "",
      subtitle: subtitleClean,
      excerpt: excerptClean,
      cover_image, 
      content, 
      tags, 
      published_at,
      created_at,
      updated_at,
      author: authorClean,
      status: raw.status || null,
      audience: raw.audience || null,
      gallery 
    };
  };

  // Fetch a single article by id or slug
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setArticle(null);
        setSanitizedHTML(""); // Clear previous content

        let data = null;

        // 1) Try slug first (for SEO-friendly URLs)
        if (slug) {
          const decoded = decodeURIComponent(slug);
          try {
            const r = await api.get(`/blogposts`, { params: { slug: decoded, status: "published" } });
            // Handle different response structures: data.results, data.data, or data array
            const responseData = r?.data;
            let arr = [];
            if (Array.isArray(responseData)) {
              arr = responseData;
            } else if (Array.isArray(responseData?.results)) {
              arr = responseData.results;
            } else if (Array.isArray(responseData?.data)) {
              arr = responseData.data;
            }
            data = arr[0] || null;
          } catch (e) {
            if (e?.response?.status !== 404) {
              console.error("Error fetching by slug:", e);
            }
          }
        }

        // 2) Fallback: by ID (preview route) if slug didn't work
        if (!data && id) {
          try {
            const r = await api.get(`/blogpost/${id}`);
            data = r?.data?.data ?? r?.data ?? null;
          } catch (e) {
            if (e?.response?.status !== 404) throw e;
          }
        }

        if (!alive.current) return;
        if (!data) {
          setErr("not_found");
          setArticle(null);
        } else {
          setArticle(normalize(data));
        }
      } catch (e) {
        console.error(e);
        if (!alive.current) return;
        setErr("load_error");
        message.error("Failed to load article");
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
  }, [id, slug, location.pathname]); // Use pathname instead of location.key for more reliable updates

  // Update title + sanitize HTML
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title || "News"} | Kibundo`;
    const html = article.content || "";
    (async () => {
      try {
        const mod = await import("dompurify");
        const DOMPurify = mod.default || mod;
        if (!alive.current) return;
        setSanitizedHTML(DOMPurify.sanitize(html));
      } catch {
        if (!alive.current) return;
        setSanitizedHTML(html);
      }
    })();
  }, [article]);

  const publishedLabel = useMemo(() => {
    const d = article?.published_at;
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(+dt)) return "";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [article?.published_at]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const dt = new Date(dateString);
    if (isNaN(+dt)) return "";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10 pb-24">
          <div className="space-y-6">
            {/* Back / Breadcrumb (with icon) */}
            <div className="flex items-center gap-2">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="!p-0 !h-auto text-neutral-700"
                aria-label="Back"
              />
              <Text type="secondary">/</Text>
              <Link to="/parent/communications/news">
                <Button type="link" className="px-0">
                  News
                </Button>
              </Link>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Spin size="large" />
              </div>
            ) : err === "not_found" ? (
              <div className="py-12">
                <Empty description="Article not found" />
              </div>
            ) : err === "load_error" ? (
              <div className="py-12">
                <Empty description="Failed to load article" />
              </div>
            ) : !article ? (
              <div className="py-12">
                <Empty description="No article data" />
              </div>
            ) : (
              <>
                {/* Blog Post Details Header */}
                <div className="mb-6 space-y-4">
                  {/* Tags */}
                  {!!article.tags?.length && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((t, i) => (
                        <Tag key={`${t}-${i}`} color="blue" className="rounded-full px-3 py-1">
                          {t}
                        </Tag>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <Title level={1} className="!mb-2 !text-3xl md:!text-4xl leading-tight">
                    {article.title}
                  </Title>

                  {/* Subtitle */}
                  {article.subtitle && (
                    <Text className="text-lg text-neutral-600 block mb-3">
                      {article.subtitle}
                    </Text>
                  )}

                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 border-b border-neutral-200 pb-4">
                    {article.author && article.author !== "undefined" && article.author !== "null" && (
                      <div className="flex items-center gap-1">
                        <Text type="secondary" strong>Author:</Text>
                        <Text type="secondary">{article.author}</Text>
                      </div>
                    )}
                    {publishedLabel && (
                      <div className="flex items-center gap-1">
                        <Text type="secondary" strong>Published:</Text>
                        <Text type="secondary">{publishedLabel}</Text>
                      </div>
                    )}
                    {article.audience && (
                      <div className="flex items-center gap-1">
                        <Text type="secondary" strong>Audience:</Text>
                        <Text type="secondary" className="capitalize">{article.audience}</Text>
                      </div>
                    )}
                    {article.status && (
                      <div className="flex items-center gap-1">
                        <Text type="secondary" strong>Status:</Text>
                        <Tag color={article.status === "published" ? "green" : "orange"} className="m-0">
                          {article.status}
                        </Tag>
                      </div>
                    )}
                  </div>

                  {/* Additional Dates */}
                  {(article.created_at || article.updated_at) && (
                    <div className="text-xs text-neutral-400 space-y-1">
                      {article.created_at && article.created_at !== article.published_at && (
                        <div>Created: {formatDate(article.created_at)}</div>
                      )}
                      {article.updated_at && article.updated_at !== article.published_at && (
                        <div>Last updated: {formatDate(article.updated_at)}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cover image */}
                {article.cover_image && (
                  <div className="rounded-2xl overflow-hidden ring-4 ring-white/60 mb-6">
                    <img
                      src={article.cover_image.startsWith("http") || article.cover_image.startsWith("//") 
                        ? article.cover_image 
                        : `${window.location.origin}${article.cover_image.startsWith("/") ? "" : "/"}${article.cover_image}`}
                      alt={article.title || "Article image"}
                      className="w-full max-h-[420px] object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}

                {/* Optional excerpt */}
                {article.excerpt && (
                  <p className="text-neutral-700 text-lg mb-4">{article.excerpt}</p>
                )}

                {/* Additional pictures/gallery (if provided by API fields) */}
                {!!article.gallery?.length && (
                  <div className="mb-6">
                    <div className="mb-2 font-semibold text-neutral-800">Pictures</div>
                    <div className="grid grid-cols-2 gap-3">
                      {article.gallery.map((url, idx) => (
                        <a
                          key={`${url}-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl overflow-hidden ring-4 ring-white/60 hover:opacity-95 transition"
                          aria-label={`Open image ${idx + 1}`}
                        >
                          <img
                            src={url}
                            alt={`Article image ${idx + 1}`}
                            className="w-full h-36 object-cover"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full content (may also include inline images) */}
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
                />
              </>
            )}

          </div>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </div>
  );
}
