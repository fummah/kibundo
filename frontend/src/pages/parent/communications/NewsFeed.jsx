// src/pages/parent/communications/NewsFeed.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Tag, Empty, message, Button, Skeleton } from "antd";
import { RightOutlined } from "@ant-design/icons";

// ParentShell is now handled at route level
import api from "@/api/axios";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";
import ParentSpaceBar from "@/components/parent/ParentSpaceBar.jsx";

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
  if (p.external_url) return p.external_url.trim();
  if (p.slug) return `/parent/communications/news/${encodeURIComponent(p.slug)}`;
  if (isNumericId(p.id)) return `/parent/communications/news/preview/${p.id}`;
  return null;
}

/* ---------- cards ---------- */
function FeaturedCard({ article, onOpen }) {
  const clickable = Boolean(article?.href || article?.id || article?.slug);
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
            src={article.image && (article.image.startsWith("http") || article.image.startsWith("//") || article.image.startsWith("blob:"))
              ? article.image 
              : article.image && article.image.startsWith("/")
              ? `${window.location.origin}${article.image}`
              : article.image || ""}
            alt={article.title || "Article image"}
            className="w-full h-[240px] sm:h-[320px] object-cover"
            loading="lazy"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <h2 className="text-[20px] sm:text-[24px] leading-tight font-extrabold text-neutral-800 mb-2">
          {article.title}
        </h2>

        {article.excerpt ? (
          <p className="text-neutral-700 text-[15px] sm:text-[16px]">{article.excerpt}</p>
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
  const clickable = Boolean(article?.href || article?.id || article?.slug);
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
          {article.tag ? (
            <Tag color="green" className="mb-1">
              {article.tag}
            </Tag>
          ) : null}

          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-neutral-800 leading-snug">
            {article.title}
          </h3>

          {article.excerpt ? (
            <p className="text-neutral-700 mt-1 text-[14px] sm:text-[15px]">{article.excerpt}</p>
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
          <img src={article.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
const CACHE_KEY = "kib_parent_news_cache_v3";
const PAGE_SIZE = 2;

export default function NewsFeed() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);

  // pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "Kibundo News | Parent";
  }, []);

  // seed from cache
  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached?.items?.length) {
        setArticles(cached.items);
        setLoading(false);
      }
    } catch {}
  }, []);

  // fetch
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
        const placeholders = [platnews, unkcat, blognews, newsImg];

        const mapped = list.map((p, idx) => {
          const tags =
            Array.isArray(p.tags)
              ? p.tags.filter(Boolean)
              : typeof p.tags === "string"
              ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : [];

        // Helper to clean undefined/null strings
        const cleanString = (val, fallback = "") => {
          if (!val) return fallback;
          const str = String(val).trim();
          return str && str !== "undefined" && str !== "null" ? str : fallback;
        };

        // Use uploaded thumbnail_url if available, otherwise fallback to placeholder
        // Check multiple possible field names
        let imageUrl = p.thumbnail_url || p.thumbnail || p.image_url || p.cover_image || p.image || null;
        
        if (imageUrl) {
          // Clean the URL - remove any whitespace
          imageUrl = String(imageUrl).trim();
          
          // Convert relative URLs to absolute
          if (!imageUrl.startsWith("http") && !imageUrl.startsWith("//") && !imageUrl.startsWith("blob:")) {
            // Handle both /uploads/... and uploads/... formats
            if (imageUrl.startsWith("/")) {
              imageUrl = `${window.location.origin}${imageUrl}`;
            } else {
              imageUrl = `${window.location.origin}/${imageUrl}`;
            }
          }
        } else {
          // Fallback to placeholder images only if no image was uploaded
          imageUrl = placeholders[idx % placeholders.length];
        }

        const base = {
            id: p.id,
            featured: Boolean(p.featured || p.is_featured || idx === 0),
            title: cleanString(p.title, "Headline Article"),
            excerpt: cleanString(
              p.excerpt || p.summary || p.subtitle,
              "Explore the latest math games designed to make learning fun."
            ),
            image: imageUrl,
            published_at: p.published_at || p.created_at || null,
            tags,
            tag: cleanString(p.category || p.audience, null),
            slug: cleanString(p.slug, null),
            external_url: cleanString(p.url || p.link || p.external_url, null),
          };

          const href = buildArticleHref(base);
          return { ...base, href };
        });

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
        finalList.sort((a, b) => Number(b.featured) - Number(a.featured));

        setArticles(finalList);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items: finalList }));
      } catch (e) {
        if (e.code === "ERR_CANCELED") return;
        console.error(e);
        setErr("Failed to load articles");
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

  // filter
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

  // featured + rest
  const featured = useMemo(
    () => filtered.find((a) => a.featured) || filtered[0] || null,
    [filtered]
  );
  const rest = useMemo(() => {
    if (!featured) return filtered;
    return filtered.filter((a) => a.id !== featured.id);
  }, [filtered, featured]);

  // reset to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [q, filtered.length]);

  // slice rest for current page (2 per page)
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const visibleRest = rest.slice(startIdx, startIdx + PAGE_SIZE);
  const rangeStart = rest.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + PAGE_SIZE, rest.length);

  // scroll to top on page change (nice on mobile)
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }, [page]);

  function openArticle(article) {
    if (!article) {
      message.info("No article selected.");
      return;
    }

    // Always build href from the clicked article's own data to ensure we open the correct one
    let href = null;
    
    // Priority: external_url > slug > id
    // Use slug first for SEO and UX benefits, fallback to ID for reliability
    if (article?.external_url?.trim()) {
      href = article.external_url.trim();
    } else if (article?.slug?.trim()) {
      // Prefer slug for SEO-friendly, human-readable URLs
      href = `/parent/communications/news/${encodeURIComponent(article.slug.trim())}`;
    } else if (article?.id && isNumericId(article.id)) {
      // Fallback to ID if slug is not available (more reliable)
      href = `/parent/communications/news/preview/${article.id}`;
    }

    if (!href) {
      message.info("This is a demo article.");
      return;
    }

    try {
      window?.analytics?.track?.("news_read_clicked", {
        slug: article.slug ?? null,
        id: article.id ?? null,
      });
    } catch {}

    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href);
    } else {
      // Navigate with state to ensure React Router treats this as a new navigation
      navigate(href, { 
        state: { articleId: article.id, timestamp: Date.now() },
        replace: false 
      });
      try {
        window.scrollTo({ top: 0, behavior: "auto" });
      } catch {}
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10 pb-24">
          <div className="space-y-6">
            <div className="text-center mb-3">
              <h1
                className="text-[28px] font-extrabold text-neutral-800"
                style={{ fontFamily: "system-ui, ui-rounded, 'SF Pro Rounded', ui-sans-serif" }}
              >
                Kibundo News
              </h1>
            </div>

            <div className="mb-4">
              <Input
                allowClear
                placeholder="search …"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 rounded-[14px] bg-[#FFE9D9]/60 border border-[#F4C9AE] placeholder:text-neutral-400"
              />
            </div>

            <div className="text-neutral-700 font-extrabold text-[18px] mb-3">News</div>

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
                {featured && (
                  <div className="mb-6">
                    <FeaturedCard article={featured} onOpen={openArticle} />
                  </div>
                )}

                {rest.length > 0 && (
                  <div className="text-neutral-700 font-extrabold text-[18px] mb-3">
                    Weitere Artikel
                  </div>
                )}

                {/* paginated list: 2 per page */}
                <div className="space-y-4">
                  {visibleRest.map((a) => (
                    <ListCard key={a.id ?? `a-${a.title}`} article={a} onOpen={openArticle} />
                  ))}
                </div>

                {/* pagination controls */}
                {rest.length > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      shape="round"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>

                    <div className="text-sm text-neutral-600">
                      {rangeStart}-{rangeEnd} of {rest.length}
                    </div>

                    <Button
                      type="primary"
                      shape="round"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
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
