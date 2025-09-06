// src/pages/parent/communications/NewsArticle.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Spin, Tag, Empty, Button, message, Typography } from "antd";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";
import api from "@/api/axios";

const { Text } = Typography;

export default function NewsArticle() {
  const { slug, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [err, setErr] = useState(null);
  const [sanitizedHTML, setSanitizedHTML] = useState("");
  const isActive = useRef(true);

  useEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
    };
  }, []);

  // Normalize API shapes (images + content key)
  const normalize = (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const cover_image =
      raw.cover_image || raw.image_url || raw.thumbnail_url || raw.image || null;
    const content = raw.content ?? raw.body ?? "";
    return { ...raw, cover_image, content };
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setArticle(null);

        let data = null;

        // 1) Fetch by ID (preview route)
        if (id) {
          try {
            const r = await api.get(`/blogpost/${id}`);
            data = r?.data || null;
          } catch (e) {
            if (e?.response?.status === 404) {
              data = null; // not found; don't toast
            } else {
              throw e;
            }
          }
        }

        // 2) Fallback: fetch by slug via filter query ONLY (since slug endpoints 404)
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

        if (!isActive.current) return;
        setArticle(data ? normalize(data) : null);
        if (!data) setErr("not_found");
      } catch (e) {
        if (!isActive.current) return;
        console.error(e);
        setErr("load_error");
        message.error("Failed to load article");
      } finally {
        if (isActive.current) setLoading(false);
      }
    })();
  }, [slug, id, location.key]);

  // Title + sanitize
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title || "News"} | Kibundo`;
    const html = article.content || "";
    (async () => {
      try {
        const mod = await import("dompurify");
        const DOMPurify = mod.default || mod;
        if (!isActive.current) return;
        setSanitizedHTML(DOMPurify.sanitize(html));
      } catch {
        if (!isActive.current) return;
        setSanitizedHTML(html);
      }
    })();
  }, [article]);

  const tags = useMemo(() => {
    if (!article?.tags) return [];
    if (Array.isArray(article.tags)) return article.tags.filter(Boolean);
    if (typeof article.tags === "string") {
      return article.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return [];
  }, [article]);

  const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(+dt)
      ? null
      : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const publishedAt =
    article?.published_at || article?.created_at || article?.updated_at;
  const publishedLabel = fmtDate(publishedAt);

  return (
    <GradientShell>
      <div className="mx-auto max-w-[720px] md:max-w-[900px] pt-6 pb-28 md:pb-10">
        {/* Back / Breadcrumb */}
        <div className="mb-4 flex items-center gap-2">
          <Button type="link" onClick={() => navigate(-1)}>← Back</Button>
          <Text type="secondary">/</Text>
          <Link to="/parent/communications/news">
            <Button type="link">News</Button>
          </Link>
        </div>

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
            {!!tags.length && (
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <Tag key={`${t}-${i}`} color="blue">
                    {t}
                  </Tag>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-800 mb-2">
              {article.title}
            </h1>

            <div className="mb-4">
              <Text type="secondary">
                {article.author ? `${article.author} • ` : ""}
                {publishedLabel || ""}
              </Text>
            </div>

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

            {article.excerpt && (
              <p className="text-neutral-700 text-lg mb-4">{article.excerpt}</p>
            )}

            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />
          </>
        )}
      </div>

      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
