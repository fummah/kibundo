// src/pages/parent/communications/NewsArticle.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Spin, Tag, Empty, Button, Typography, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";
import api from "@/api/axios";

/* Optional background for visual parity */
import globalBg from "@/assets/backgrounds/global-bg.png";

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
    return () => { alive.current = false; };
  }, []);

  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  // Normalize API shapes (images + content key)
  const normalize = (raw) => {
    if (!raw || typeof raw !== "object") return null;

    const cover_image =
      raw.cover_image || raw.image_url || raw.thumbnail_url || raw.image || null;
    const content = raw.content ?? raw.body ?? "";

    const tags =
      Array.isArray(raw.tags)
        ? raw.tags.filter(Boolean)
        : typeof raw.tags === "string"
        ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

    const published_at =
      raw.published_at || raw.created_at || raw.updated_at || null;
    const author = raw.author || raw.author_name || "";

    // Try to collect additional images for a gallery
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

    return { ...raw, cover_image, content, tags, published_at, author, gallery };
  };

  // Fetch a single article by id or slug
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setArticle(null);

        let data = null;

        // 1) Preferred: by ID (preview route)
        if (id) {
          try {
            const r = await api.get(`/blogpost/${id}`);
            data = r?.data || null;
          } catch (e) {
            if (e?.response?.status !== 404) throw e;
          }
        }

        // 2) Fallback: by slug via list filter
        if (!data && slug) {
          const decoded = decodeURIComponent(slug);
          try {
            const r = await api.get(`/blogposts`, { params: { slug: decoded } });
            const arr = Array.isArray(r?.data) ? r.data : [];
            data = arr[0] || null;
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
  }, [id, slug, location.key]);

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

  return (
    <GradientShell backgroundImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        {/* Single-column (phone) layout inside mockup */}
        <section className="relative w-full max-w-[520px] px-4 pt-6 mx-auto space-y-6">
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
              <Button type="link" className="px-0">News</Button>
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
              {!!article.tags?.length && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {article.tags.map((t, i) => (
                    <Tag key={`${t}-${i}`} color="blue">
                      {t}
                    </Tag>
                  ))}
                </div>
              )}

              <Title level={3} className="!mb-2">{article.title}</Title>

              <div className="mb-4">
                <Text type="secondary">
                  {article.author ? `${article.author} • ` : ""}
                  {publishedLabel}
                </Text>
              </div>

              {/* Cover image */}
              {article.cover_image && (
                <div className="rounded-2xl overflow-hidden ring-4 ring-white/60 mb-6">
                  <img
                    src={article.cover_image}
                    alt={article.title}
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

          {/* Spacer so content never hides behind the footer */}
          <ParentTabSpacer />

          {/* Footer tab bar (mobile: fixed; desktop mockup: absolute inside frame) */}
          <BottomTabBar />
        </section>
      </div>
    </GradientShell>
  );
}
