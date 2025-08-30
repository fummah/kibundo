// src/pages/parent/communications/NewsFeed.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input, Tag } from "antd";
import { RightOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";

const ARTICLES = [
  {
    id: 1,
    featured: true,
    title: "Kibundo opens Indoor Playground",
    tag: "News",
    excerpt:
      "Great news! In cooperation with a large DIY store we’re opening an indoor playground. Learn early tech and craftsmanship.",
    image:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop",
    href: "#",
  },
  {
    id: 2,
    tag: "Blog Post",
    title: "Tips for Encouraging Reading",
    excerpt: "Learn how to foster a love for reading in your child.",
    image:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop",
    href: "#",
  },
  {
    id: 3,
    tag: "Headline Article",
    title: "Explore New Math Worlds",
    excerpt: "Explore the latest math games designed to make learning fun.",
    image:
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1200&auto=format&fit=crop",
    href: "#",
  },
  {
    id: 4,
    tag: "Blog Post",
    title: "Further Chapter Headline",
    excerpt: "Short tips and activities to keep kids curious every day.",
    image:
      "https://images.unsplash.com/photo-1519682577862-22b62b24e493?q=80&w=1200&auto=format&fit=crop",
    href: "#",
  },
];

function FeaturedCard({ article }) {
  return (
    <div className="bg-white/85 backdrop-blur rounded-2xl border border-white/70 shadow-[0_10px_28px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="text-neutral-700 font-extrabold mb-3 text-lg">News</div>
        <div className="rounded-2xl overflow-hidden ring-4 ring-white/60 mb-4">
          <img src={article.image} alt={article.title} className="w-full h-60 sm:h-80 object-cover" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-800">{article.title}</h2>
        <p className="text-neutral-700 mt-2">{article.excerpt}</p>

        <Link
          to={article.href}
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
          {article.tag && (
            <Tag color="green" className="mb-1">{article.tag}</Tag>
          )}
          <h3 className="text-lg sm:text-xl font-extrabold text-neutral-800 leading-snug">
            {article.title}
          </h3>
          <p className="text-neutral-700 mt-1">{article.excerpt}</p>

          <Link
            to={article.href}
            className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
          >
            read article <RightOutlined />
          </Link>
        </div>

        <div className="w-28 sm:w-36 h-24 sm:h-28 shrink-0 rounded-xl overflow-hidden ring-4 ring-white/60 self-center">
          <img src={article.image} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

export default function NewsFeed() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ARTICLES;
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(t) ||
        (a.excerpt || "").toLowerCase().includes(t) ||
        (a.tag || "").toLowerCase().includes(t)
    );
  }, [q]);

  const featured = filtered.find((a) => a.featured) || ARTICLES[0];
  const rest = filtered.filter((a) => a.id !== featured.id);

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

        {/* Featured */}
        <div className="mb-6">
          <FeaturedCard article={featured} />
        </div>

        {/* More */}
        <div className="text-neutral-800 font-extrabold mb-3">
          More Articles
        </div>
        <div className="space-y-4">
          {rest.map((a) => (
            <ListCard key={a.id} article={a} />
          ))}
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
