import { Link } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import { Card, Row, Col, Typography, Tag, Avatar, Empty, Tooltip, Badge as AntBadge } from "antd";
import { TrophyOutlined, StarFilled, CrownOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

/** Dummy Data */
const CHILDREN = [
  { id: 1, name: "Name Child one", meta: "Age X, Grade 3", avatar: "https://i.pravatar.cc/120?img=5" },
  { id: 2, name: "Name Child two", meta: "Age X, Grade 1", avatar: "https://i.pravatar.cc/120?img=12" },
];

const BADGES_CATALOG = [
  {
    id: "b-reading-gold",
    title: "Reading Gold",
    desc: "Read 5 books this month.",
    color: "gold",
    icon: <StarFilled />,
  },
  {
    id: "b-math-master",
    title: "Math Master",
    desc: "Perfect score on 3 quizzes.",
    color: "blue",
    icon: <CrownOutlined />,
  },
  {
    id: "b-focus-hero",
    title: "Focus Hero",
    desc: "7-day streak with focus time.",
    color: "purple",
    icon: <TrophyOutlined />,
  },
];


const CHILD_BADGES = {
  1: [
    { badgeId: "b-reading-gold", earnedOn: "2025-08-15" },
    { badgeId: "b-math-master", earnedOn: "2025-08-20" },
  ],
  2: [{ badgeId: "b-focus-hero", earnedOn: "2025-08-10" }],
};

function findBadge(badgeId) {
  return BADGES_CATALOG.find((b) => b.id === badgeId);
}

export default function AchievementsPage() {
  const { t } = useTranslation();

  return (
    <GradientShell>
      <div className="mx-auto max-w-[1200px] pt-6 pb-10 px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-6">
          <div>
            <Title level={3} className="!mb-0">
              {t("parent.achievements.title")}
            </Title>
            <Text type="secondary">{t("parent.achievements.subtitle")}</Text>
          </div>
          <div className="text-emerald-700 font-semibold flex items-center gap-2">
            <TrophyOutlined /> {t("parent.achievements.allBadges")}
          </div>
        </div>

        {/* Children sections */}
        {CHILDREN.map((child) => {
          const earned = (CHILD_BADGES[child.id] || []).map((e) => ({
            ...findBadge(e.badgeId),
            earnedOn: e.earnedOn,
          }));

          return (
            <Card
              key={child.id}
              className="shadow-sm rounded-2xl mb-8"
              title={
                <div className="flex items-center gap-3">
                  <Avatar size={48} src={child.avatar} />
                  <div className="leading-tight">
                    <div className="text-lg font-extrabold text-neutral-800">{child.name}</div>
                    <div className="text-[13px] text-neutral-500">{child.meta}</div>
                  </div>
                </div>
              }
              extra={
                <Link
                  to={`/parent/myfamily/student/${child.id}`}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  {t("parent.achievements.viewChild")}
                </Link>
              }
            >
              {earned.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t("parent.achievements.empty")}
                  className="my-8"
                />
              ) : (
                <Row gutter={[16, 16]}>
                  {earned.map((b) => (
                    <Col xs={24} sm={12} md={8} key={`${child.id}-${b.id}`}>
                      <Link
                        to={`/parent/myfamily/student/${child.id}`}
                        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
                      >
                        <Card
                          hoverable
                          className="rounded-2xl shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
                          styles={{ body: { padding: 16 } }}
                          cover={
                            <div className="h-28 grid place-items-center">
                              <AntBadge.Ribbon text={t("parent.achievements.badge")} color="volcano">
                                <div className="text-4xl">{b.icon}</div>
                              </AntBadge.Ribbon>
                            </div>
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-extrabold text-neutral-800">{b.title}</div>
                              <div className="text-neutral-600 text-sm">{b.desc}</div>
                            </div>
                            <Tag color={b.color}>{t("parent.achievements.earned")}</Tag>
                          </div>
                          <div className="mt-2 text-[12px] text-neutral-500">
                            <Tooltip title={b.earnedOn}>
                              {t("parent.achievements.earnedOn", { date: b.earnedOn })}
                            </Tooltip>
                          </div>
                        </Card>
                      </Link>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          );
        })}
      </div>
    </GradientShell>
  );
}
