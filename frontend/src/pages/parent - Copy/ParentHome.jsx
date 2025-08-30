import { Card, Avatar } from "antd";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import NewsCard from "@/components/NewsCard";

/* ----------------- Mock Data (replace with API later) ----------------- */
const recentActivity = [
  { id: 1, who: "Name Child one", text: "Completed a math lesson for homework", color: "bg-[#B7ECEB]" },
  { id: 2, who: "Name Child two", text: "started a reading exercise", color: "bg-[#F7D6E9]" },
];

const students = [
  { id: 1, name: "Name Child one", grade: "Age X, Grade 3", avatar: "/assets/child-boy.png" },
  { id: 2, name: "Name Child two", grade: "Age X, Grade 1", avatar: "/assets/child-girl.png" },
];

const news = [
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
    badge: "Platform update",
    badgeColor: "#c96aa3",
    title: "New Math Games Added",
    excerpt: "Explore the latest math games designed to make learning fun.",
    image: "/assets/news2.jpg",
  },
  {
    id: 3,
    badge: "Unknown Category",
    badgeColor: "#1f8a9e",
    title: "Further Chapter Headline",
    excerpt: "Explore the latest math games designed to make learning fun.",
    image: "/assets/news3.jpg",
  },
];

export default function AdultHome() {
  return (
    <div className="mobile-only">
      <GradientShell pad={false}>
        {/* Centered title like the mock; no back button */}
        <TopBar title="Home" showBack={false} />

        <div className="px-5">
          {/* Activities */}
          <section className="mt-4">
            <h3 className="text-[18px] font-extrabold text-[#6e5e4e] mb-2">Activities</h3>
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <Card
                  key={a.id}
                  size="small"
                  className={`rounded-2xl shadow border-0 ${a.color}`}
                  styles={{ body: { padding: 14 } }}
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/60 grid place-items-center text-[#6e5e4e] font-bold shadow-sm">
                      {a.who?.[0] ?? "C"}
                    </div>
                    <div className="leading-tight">
                      <div className="font-extrabold text-[#544536]">{a.who}</div>
                      <div className="text-[13px] text-[#6b6b6b]">{a.text}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Your Children */}
          <section className="mt-6">
            <h3 className="text-[18px] font-extrabold text-[#6e5e4e] mb-3">Your Childs</h3>
            <div className="grid grid-cols-3 gap-4">
              {students.map((s) => (
                <div key={s.id} className="text-center">
                  <div className="relative mx-auto w-[76px] h-[76px] rounded-full bg-[#f7f1ea] grid place-items-center ring-2 ring-white shadow">
                    <Avatar
                      src={s.avatar || undefined}
                      size={70}
                      className="bg-transparent"
                    >
                      {!s.avatar ? (s.name?.[0] || "S") : null}
                    </Avatar>
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-[#544536]">{s.name}</div>
                  <div className="text-[12px] text-[#8a7f73]">{s.grade}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider line like mock */}
          <div className="my-5 h-px bg-white/50"></div>

          {/* News & Insights */}
          <section className="pb-28">
            <h3 className="text-[18px] font-extrabold text-[#6e5e4e] mb-3">News & Insights</h3>
            <div className="space-y-4">
              {news.map((n) => (
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
        </div>

        <BottomNav />
      </GradientShell>
    </div>
  );
}
