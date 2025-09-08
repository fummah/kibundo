// src/pages/parent/communications/NewsFeed.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Tag, Empty, message, Button, Skeleton } from "antd";
import { RightOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";
import api from "@/api/axios";

// Background (optional: looks consistent with other parent screens)
import globalBg from "@/assets/backgrounds/global-bg.png";

// PLACEHOLDER IMAGES (fallbacks)
import platnews from "@/assets/parent/platnews.png";
import unkcat from "@/assets/parent/unkcat.png";
import blognews from "@/assets/parent/blognews.png";
import newsImg from "@/assets/parent/news.png";

/* ---------- helpers ---------- */
function isNumericId(val) {
  return typeof val === "number" || (typeof val === "string" && /^[0-9]+$/.test(val));
}

function buildArticleHref(p) {
  // Prefer an explicit external URL if present
  if (p.external_url) return p.external_url.trim();

  // Slugged article route
  if (p.slug) return `/parent/communications/news/${encodeURIComponent(p.slug)}`;

  // Preview route only when the id looks like a real numeric backend id
  if (isNumericId(p.id)) return `/parent/communications/news/preview/${p.id}`;

  // No routable target
  return null;
}

/* ---------- cards ---------- */
function FeaturedCard({ article, onOpen }) {
  const clickable = Boolean(article?.href);
  return (
    <div
      className={[
        "rounded-[22px] border border-white/70 bg-white/85 backdrop-blur shadow-[0_14px_26px_rgba(0,0,0,0.08)] overflow-hidden",
        clickable ? "cursor-pointer active:scale-[0.997] transition-transform" : "",
      ].join(" ")}
      onClick={() => clickable && onOpen?.(article)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.(article);
        }
      }}
    >
      <div className="p-3 sm:p-4">
        <div className="text-[18px] font-extrabold text-neutral-700 mb-3">News</div>

        <div className="rounded-[18px] overflow-hidden ring-4 ring-white/70 mb-3 pointer-events-none">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-[240px] sm:h-[320px] object-cover"
            loading="lazy"
          />
        </div>

        <h2 className="text-[20px] sm:text-[24px] leading-tight font-extrabold text-neutral-800 mb-2">
          {article.title}
        </h2>

        {article.excerpt ? (
          <p className="text-neutral-700 text-[15px] sm:text-[16px]">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-4">
          <Button
            type="primary"
            className="rounded-full bg-orange-500 hover:bg-orange-600"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(article);
            }}
          >
            read article <RightOutlined />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListCard({ article, onOpen }) {
  const clickable = Boolean(article?.href);
  return (
    <div
      className={[
        "w-full p-4 sm:p-5 rounded-[18px] border border-white/70 bg-white/85 backdrop-blur shadow-[0_12px_22px_rgba(0,0,0,0.08)]",
        clickable ? "cursor-pointer hover:shadow-[0_14px_26px_rgba(0,0,0,0.09)] transition-shadow" : "",
      ].join(" ")}
      onClick={() => clickable && onOpen?.(article)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen?.(article);
        }
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {article.tag ? <Tag color="green" className="mb-1">{article.tag}</Tag> : null}

          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-neutral-800 leading-snug">
            {article.title}
          </h3>

          {article.excerpt ? (
            <p className="text-neutral-700 mt-1 text-[14px] sm:text-[15px]">
              {article.excerpt}
            </p>
          ) : null}

          <div className="mt-3">
            <Button
              type="primary"
              size="small"
              className="rounded-full bg-orange-500 hover:bg-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(article);
              }}
            >
              read article <RightOutlined />
            </Button>
          </div>
        </div>

        <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0 rounded-[14px] overflow-hidden ring-4 ring-white/70 pointer-events-none">
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
const CACHE_KEY = "kib_parent_news_cache_v3";

export default function NewsFeed() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    document.title = "Kibundo News | Parent";
  }, []);

  // Fast paint from cache
  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached?.items?.length) {
        setArticles(cached.items);
        setLoading(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const { data } = await api.get("/blogposts", {
          signal: controller.signal,
          params: { status: "published", audience: "parents" },
        });

        const list = Array.isArray(data?.results ?? data) ? (data.results ?? data) : [];

        // Map + placeholders to match the mock
        const placeholders = [platnews, unkcat, blognews, newsImg];

        const mapped = list.map((p, idx) => {
          const tags =
            Array.isArray(p.tags)
              ? p.tags.filter(Boolean)
              : typeof p.tags === "string"
              ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : [];

          const base = {
            id: p.id,
            featured: Boolean(p.featured || p.is_featured || idx === 0),
            title: p.title || "Headline Article",
            excerpt:
              p.excerpt || p.summary || p.subtitle ||
              "Explore the latest math games designed to make learning fun.",
            image:
              p.image_url || p.cover_image || p.thumbnail_url || p.image ||
              placeholders[idx % placeholders.length],
            published_at: p.published_at || p.created_at || null,
            tags,
            tag: p.category || p.audience || null,
            slug: p.slug,
            external_url: p.url || p.link || p.external_url || null,
          };

          const href = buildArticleHref(base);

          return { ...base, href };
        });

        // Fallback placeholders if API empty
        const fallback = [
          {
            id: "ph-1",
            featured: true,
            title: "Kibundo eröffnet Indoor Spielplatz",
            excerpt:
              "Wir haben großartige News in Kooperation mit einem großen Baumarkt eröffnen wir einen Indoorspielplatz. Früh Technik und Handwerk lernen.",
            image: platnews,
            tag: null,
            href: null,
          },
          {
            id: "ph-2",
            featured: false,
            title: "Tips for Encouraging Reading",
            excerpt: "Learn how to foster a love for reading in your child.",
            image: unkcat,
            tag: null,
            href: null,
          },
          {
            id: "ph-3",
            featured: false,
            title: "Headline Article",
            excerpt: "Explore the latest math games designed to make learning fun.",
            image: blognews,
            tag: null,
            href: null,
          },
          {
            id: "ph-4",
            featured: false,
            title: "Further Chapter Headline",
            excerpt: "Explore the latest math games designed to make learning fun.",
            image: newsImg,
            tag: "Blog Post",
            href: null,
          },
        ];

        const finalList = mapped.length ? mapped : fallback;

        // Sort: featured first
        finalList.sort((a, b) => Number(b.featured) - Number(a.featured));

        setArticles(finalList);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: finalList }));
      } catch (e) {
        console.error(e);
        setErr("Failed to load articles");
        // show placeholders on error
        setArticles([
          {
            id: "ph-1",
            featured: true,
            title: "Kibundo eröffnet Indoor Spielplatz",
            excerpt:
              "Wir haben großartige News in Kooperation mit einem großen Baumarkt eröffnen wir einen Indoorspielplatz. Früh Technik und Handwerk lernen.",
            image: platnews,
            tag: null,
            href: null,
          },
          {
            id: "ph-2",
            featured: false,
            title: "Tips for Encouraging Reading",
            excerpt: "Learn how to foster a love for reading in your child.",
            image: unkcat,
            tag: null,
            href: null,
          },
          {
            id: "ph-3",
            featured: false,
            title: "Headline Article",
            excerpt: "Explore the latest math games designed to make learning fun.",
            image: blognews,
            tag: null,
            href: null,
          },
          {
            id: "ph-4",
            featured: false,
            title: "Further Chapter Headline",
            excerpt: "Explore the latest math games designed to make learning fun.",
            image: newsImg,
            tag: "Blog Post",
            href: null,
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Search filters the visible list but keeps the layout
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return articles;
    return articles.filter((a) => {
      const inTitle = a.title?.toLowerCase().includes(t);
      const inExcerpt = a.excerpt?.toLowerCase().includes(t);
      const inTag = a.tag?.toLowerCase().includes(t);
      return inTitle || inExcerpt || inTag;
    });
  }, [q, articles]);

  const featured = useMemo(
    () => filtered.find((a) => a.featured) || filtered[0] || null,
    [filtered]
  );

  const rest = useMemo(() => {
    if (!featured) return filtered;
    return filtered.filter((a) => a.id !== featured.id);
  }, [filtered, featured]);

  // Centralized open handler (handles placeholders & external links)
  function openArticle(article) {
    const href = article?.href?.trim?.();
    if (!href) {
      message.info("This is a demo article.");
      return;
    }

    // optional analytics
    try {
      window?.analytics?.track?.("news_read_clicked", {
        slug: article.slug ?? null,
        id: article.id ?? null,
      });
    } catch {}

    if (/^https?:\/\//i.test(href)) {
      // External link
      window.location.assign(href);
    } else {
      // Internal route to article detail page
      navigate(href);
      try {
        window.scrollTo({ top: 0, behavior: "auto" });
      } catch {}
    }
  }

  return (
    <GradientShell backgroundImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        {/* Single-column phone layout inside mockup; leave room for footer */}
        <section className="relative w-full max-w-[520px] px-4 pt-4 mx-auto">
          {/* Title */}
          <div className="text-center mb-3">
            <h1
              className="text-[28px] font-extrabold text-neutral-800"
              style={{ fontFamily: "system-ui, ui-rounded, 'SF Pro Rounded', ui-sans-serif" }}
            >
              Kibundo News
            </h1>
          </div>

          {/* Search */}
          <div className="mb-4">
            <Input
              allowClear
              placeholder="search …"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 rounded-[14px] bg-[#FFE9D9]/60 border border-[#F4C9AE] placeholder:text-neutral-400"
            />
          </div>

          {/* Section label */}
          <div className="text-neutral-700 font-extrabold text-[18px] mb-3">News</div>

          {/* Loading / Error / Empty */}
          {loading && !articles.length ? (
            <div className="py-6 space-y-4">
              <Skeleton active round />
              <Skeleton active round />
              <Skeleton active paragraph={{ rows: 2 }} round />
            </div>
          ) : err && !filtered.length ? (
            <div className="py-12">
              <Empty description="Could not load news" />
            </div>
          ) : !filtered.length ? (
            <div className="py-12">
              <Empty description="No matching articles" />
            </div>
          ) : (
            <>
              {/* Featured hero */}
              {featured && (
                <div className="mb-6">
                  <FeaturedCard article={featured} onOpen={openArticle} />
                </div>
              )}

              {/* “Weitere Artikel” */}
              {rest.length > 0 && (
                <div className="text-neutral-700 font-extrabold text-[18px] mb-3">
                  Weitere Artikel
                </div>
              )}

              {/* List cards */}
              <div className="space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
                {rest.map((a) => (
                  <ListCard key={a.id ?? `a-${a.title}`} article={a} onOpen={openArticle} />
                ))}
              </div>
            </>
          )}

          {/* Spacer so content never hides behind the bottom bar */}
          <ParentTabSpacer />

          {/* Bottom tab bar INSIDE the mockup */}
          <BottomTabBar />
        </section>
      </div>
    </GradientShell>
  );
}
