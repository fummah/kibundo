// src/pages/parent/NewsFeed.jsx
import { useMemo, useState } from "react";
import { Card, Input, Button, Tag } from "antd";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import GlobalLayout from "@/components/layouts/GlobalLayout";
import NewsCard from "@/components/NewsCard"; // from earlier

const { Search } = Input;

/* ---------------- Mock Data (replace with API later) ---------------- */
const FEATURED = {
  id: 999,
  title: "Kibundo eröffnet Indoor Spielplatz",
  excerpt:
    "Wir haben großartige News: In Kooperation mit einem großen Baumarkt eröffnen wir einen Indoorspielplatz. Früh Technik und Handwerk lernen.",
  image: "/assets/featured-park.jpg",
  badge: "News",
  badgeColor: "#f0932b",
  cta: "read article",
};

const ARTICLES = [
  {
    id: 1,
    badge: "Blog Post",
    badgeColor: "#69b06b",
    title: "Tips for Encouraging Reading",
    excerpt: "Learn how to foster a love for reading in your child.",
    image: "/assets/news1.jpg",
  },
  {
    id: 2,
    badge: "Headline",
    badgeColor: "#6c5ce7",
    title: "Headline Article",
    excerpt:
      "Explore the latest math games designed to make learning fun.",
    image: "/assets/news2.jpg",
  },
  {
    id: 3,
    badge: "Blog Post",
    badgeColor: "#1f8a9e",
    title: "Further Chapter Headline",
    excerpt:
      "Explore the latest math games designed to make learning fun.",
    image: "/assets/news3.jpg",
  },
];

/* ---------------- Reusable blocks ---------------- */
function FeaturedCard({ data }) {
  return (
    <Card className="rounded-2xl shadow-lg border-0" styles={{ body: { padding: 14 } }}>
      <div className="overflow-hidden rounded-xl h-[180px] md:h-[260px] mb-3">
        <img
          src={data.image}
          alt={data.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="mb-2">
        <Tag
          style={{
            background: `${data.badgeColor}1a`,
            color: data.badgeColor,
            border: `1px solid ${data.badgeColor}33`,
          }}
          className="rounded-full px-3 py-1 text-[12px]"
        >
          {data.badge}
        </Tag>
      </div>

      <div className="text-[20px] font-extrabold text-[#544536] leading-tight">
        {data.title}
      </div>
      <p className="mt-1 text-[13px] text-[#7a7066]">{data.excerpt}</p>

      <Button
        size="small"
        className="mt-3 rounded-full bg-[#ff8f3e] border-none text-white font-semibold"
      >
        {data.cta}
      </Button>
    </Card>
  );
}

function ListSection({ items, title = "Weitere Artikel" }) {
  return (
    <section className="mt-5">
      <h3 className="text-[18px] font-extrabold text-[#6e5e4e] mb-3">{title}</h3>
      <div className="space-y-4">
        {items.map((n) => (
          <NewsCard
            key={n.id}
            badge={n.badge}
            badgeColor={n.badgeColor}
            title={n.title}
            excerpt={n.excerpt}
            image={n.image}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Mobile view ---------------- */
function MobileView() {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(q.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(q.toLowerCase())
      ),
    [q]
  );

  return (
    <div className="mobile-only">
      <GradientShell pad={false}>
        <TopBar title="Kibundo News" showBack={false} />

        <div className="px-5 pb-28">
          <Search
            allowClear
            size="large"
            placeholder="search …"
            className="rounded-2xl mb-4"
            onChange={(e) => setQ(e.target.value)}
          />

          <section>
            <h3 className="text-[18px] font-extrabold text-[#6e5e4e] mb-3">News</h3>
            <FeaturedCard data={FEATURED} />
          </section>

          <ListSection items={filtered} />
        </div>

        <BottomNav />
      </GradientShell>
    </div>
  );
}

/* ---------------- Desktop view ---------------- */
function DesktopView() {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(q.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(q.toLowerCase())
      ),
    [q]
  );

  return (
    <div className="desktop-only">
      <GlobalLayout>
        <div className="mx-auto w-full max-w-5xl p-8">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#6e5e4e] text-center mb-6">
            Kibundo News
          </h1>

          <Search
            allowClear
            size="large"
            placeholder="search …"
            className="rounded-2xl mb-6"
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="grid grid-cols-12 gap-6">
            {/* Left: featured */}
            <div className="col-span-12 md:col-span-7">
              <FeaturedCard data={FEATURED} />
            </div>

            {/* Right: list */}
            <div className="col-span-12 md:col-span-5">
              <ListSection items={filtered} title="Weitere Artikel" />
            </div>
          </div>
        </div>
      </GlobalLayout>
    </div>
  );
}

export default function NewsFeed() {
  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  );
}
