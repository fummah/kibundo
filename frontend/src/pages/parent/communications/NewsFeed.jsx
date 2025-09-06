// src/pages/parent/communications/NewsFeed.jsx
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input, Tag, Spin, Empty, message } from "antd";
import { RightOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";
import api from "@/api/axios";

function buildArticleHref(p) {
  // Parent-scoped paths to avoid the "absolute child route" error:
  // Detail by slug:   /parent/communications/news/:slug
  // Preview by id:    /parent/communications/news/preview/:id
  if (p.slug) return `/parent/communications/news/${p.slug}`;
  if (p.id) return `/parent/communications/news/preview/${p.id}`;
  return "#";
}

function FeaturedCard({ article }) {
  return (
    <div className="bg-white/85 backdrop-blur rounded-2xl border border-white/70 shadow-[0_10px_28px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="text-neutral-700 font-extrabold mb-3 text-lg">News</div>

        {article.image ? (
          <div className="rounded-2xl overflow-hidden ring-4 ring-white/60 mb-4">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-60 sm:h-80 object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        ) : null}

        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-800">
          {article.title}
        </h2>

        {article.excerpt ? (
          <p className="text-neutral-700 mt-2">{article.excerpt}</p>
        ) : null}

        <Link
          to={article.href || "#"}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
        >
          read article <RightOutlined />
        </Link>
      </div>
    </div>
  );
}

function ListCard({ article }) {
  return (
    <div className="w-full bg-white/85 backdrop-blur rounded-2xl border border-white/70 shadow-[0_10px_28px_rgba(0,0,0,0.08)] p-4 sm:p-5">
      <div className="flex items-stretch gap-4">
        <div className="flex-1 min-w-0">
          {/* Show first tag, and if there are more, show "+N" */}
          {article.tags?.length ? (
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <Tag color="green">{article.tags[0]}</Tag>
              {article.tags.length > 1 ? (
                <Tag>+{article.tags.length - 1}</Tag>
              ) : null}
            </div>
          ) : article.tag ? (
            <Tag color="green" className="mb-1">
              {article.tag}
            </Tag>
          ) : null}

          <h3 className="text-lg sm:text-xl font-extrabold text-neutral-800 leading-snug">
            {article.title}
          </h3>

          {article.excerpt ? (
            <p className="text-neutral-700 mt-1">{article.excerpt}</p>
          ) : null}

          <Link
            to={article.href || "#"}
            className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
          >
            read article <RightOutlined />
          </Link>
        </div>

        {article.image ? (
          <div className="w-28 sm:w-36 h-24 sm:h-28 shrink-0 rounded-xl overflow-hidden ring-4 ring-white/60 self-center">
            <img
              src={article.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NewsFeed() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [err, setErr] = useState(null);

  // Fetch from backend routes (published, audience=parents)
  useEffect(() => {
    document.title = "Kibundo News | Parent";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data } = await api.get("/blogposts", {
          params: {
            status: "published",
            audience: "parents",
            // Optionally:
            // limit: 20,
            // order: "published_at:desc",
          },
        });

        const list = Array.isArray(data) ? data : [];

        // Map API shape -> UI shape
        const mapped = list.map((p) => {
          const tags =
            Array.isArray(p.tags)
              ? p.tags.filter(Boolean)
              : typeof p.tags === "string"
              ? p.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [];

          const primaryTag = tags[0] || p.category || p.audience || null;

          const image =
            p.image_url ||
            p.cover_image ||
            p.thumbnail_url ||
            p.image ||
            null;

          const base = {
            id: p.id,
            featured: Boolean(p.featured || p.is_featured),
            title: p.title || "Untitled",
            excerpt: p.excerpt || p.summary || p.subtitle || "",
            image,
            published_at: p.published_at || p.created_at || null,
            tags,
            tag: primaryTag,
            slug: p.slug,
          };

          return {
            ...base,
            href: buildArticleHref(base),
          };
        });

        // Sort: featured first, then most recent
        mapped.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });

        setArticles(mapped);
      } catch (e) {
        console.error(e);
        setErr("Failed to load articles");
        message.error("Failed to load news. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Local search
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return articles;
    return articles.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(t);
      const inExcerpt = (a.excerpt || "").toLowerCase().includes(t);
      const inTag = (a.tag || "").toLowerCase().includes(t);
      const inTags =
        Array.isArray(a.tags) && a.tags.some((tg) => tg.toLowerCase().includes(t));
      return inTitle || inExcerpt || inTag || inTags;
    });
  }, [q, articles]);

  // Prefer a featured item if present in the filtered set, else the first
  const featured = useMemo(() => {
    return filtered.find((a) => a.featured) || filtered[0] || null;
  }, [filtered]);

  const rest = useMemo(() => {
    if (!featured) return filtered;
    return filtered.filter((a) => a.id !== featured.id);
  }, [filtered, featured]);

  return (
    <GradientShell>
      <div className="mx-auto max-w-[720px] md:max-w-[1100px] pt-6 pb-28 md:pb-10">
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-800">
            Kibundo News
          </h1>
        </div>

        {/* Search */}
        <div className="mb-5">
          <Input
            allowClear
            placeholder="search …"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-2xl h-11 bg-white/80"
          />
        </div>

        {/* Loading / Error / Empty */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spin size="large" />
          </div>
        ) : err ? (
          <div className="py-12">
            <Empty description="Could not load news" />
          </div>
        ) : !filtered.length ? (
          <div className="py-12">
            <Empty description="No matching articles" />
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div className="mb-6">
                <FeaturedCard article={featured} />
              </div>
            )}

            {/* More */}
            {rest.length > 0 && (
              <>
                <div className="text-neutral-800 font-extrabold mb-3">
                  More Articles
                </div>
                <div className="space-y-4">
                  {rest.map((a) => (
                    <ListCard key={a.id} article={a} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
