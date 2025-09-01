import React from "react";
import { Layout, Card, Typography, Row, Col, Button } from "antd";
import { LeftOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

/**
 * Responsive Reading Practice Screen
 * - Mobile: hero image, title/subtitle, 2 cards in first row, 1 full-width card below
 * - Desktop: centered, wider hero, 3-card grid
 * 
 * AntD + Tailwind. Drop into your routes/pages and it will be fully responsive.
 */
export default function ReadingPracticeScreen({ onBack, onSelect }) {
  const items = [
    {
      key: "read_aloud",
      title: "Read Aloud",
      img: "https://images.unsplash.com/photo-1512446816042-444d641267b7?q=80&w=1600&auto=format&fit=crop",
    },
    {
      key: "ai_text",
      title: "AI Reading Text",
      img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
    },
    {
      key: "quiz",
      title: "Reading Quiz",
      img: "https://images.unsplash.com/photo-1553532435-93d532a45f55?q=80&w=1600&auto=format&fit=crop",
    },
  ];

  const handleClick = (key) => {
    if (onSelect) onSelect(key);
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <Header className="!bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto w-full max-w-5xl flex items-center gap-3 py-2">
          <Button type="text" icon={<LeftOutlined />} onClick={onBack} className="!px-0" />
          <Title level={4} className="!mb-0">Reading Practice</Title>
        </div>
      </Header>

      <Content>
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8 py-6 md:py-10">
          {/* Hero Image */}
          <div className="w-full overflow-hidden rounded-2xl shadow-sm border border-gray-200 bg-white">
            <img
              src="https://images.unsplash.com/photo-1604594849809-dfedbc827105?q=80&w=2400&auto=format&fit=crop"
              alt="Reading robot"
              className="w-full h-56 md:h-80 object-cover"
            />
          </div>

          {/* Headline + Subtext */}
          <div className="text-center mt-6 md:mt-8">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
              Let’s practice reading!
            </h2>
            <Paragraph className="!mt-2 text-gray-600">
              Choose an activity below to improve your reading skills.
            </Paragraph>
          </div>

          {/* Activity Grid */}
          <div className="mt-6 md:mt-10">
            {/* Mobile: 2 cols then full width; Desktop: 3 cols */}
            <Row gutter={[16, 16]} className="md:hidden">
              {items.slice(0, 2).map((it) => (
                <Col span={12} key={it.key}>
                  <Card
                    hoverable
                    className="rounded-2xl overflow-hidden shadow-sm"
                    cover={<img src={it.img} alt={it.title} className="h-40 object-cover" />}
                    onClick={() => handleClick(it.key)}
                  >
                    <Title level={5} className="!mb-0">{it.title}</Title>
                  </Card>
                </Col>
              ))}
              <Col span={24}>
                <Card
                  hoverable
                  className="rounded-2xl overflow-hidden shadow-sm"
                  cover={<img src={items[2].img} alt={items[2].title} className="h-40 object-cover" />}
                  onClick={() => handleClick(items[2].key)}
                >
                  <Title level={5} className="!mb-0">{items[2].title}</Title>
                </Card>
              </Col>
            </Row>

            {/* Desktop / Tablet: 3 column grid */}
            <Row gutter={[20, 20]} className="hidden md:flex">
              {items.map((it) => (
                <Col xs={24} sm={12} md={8} key={it.key}>
                  <Card
                    hoverable
                    className="rounded-2xl overflow-hidden shadow-sm h-full flex flex-col"
                    cover={<img src={it.img} alt={it.title} className="h-52 object-cover" />}
                    onClick={() => handleClick(it.key)}
                  >
                    <Title level={5} className="!mb-0">{it.title}</Title>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

/**
 * Example usage:
 *
 * import ReadingPracticeScreen from './ReadingPracticeScreen';
 * 
 * export default function Page() {
 *   return (
 *     <ReadingPracticeScreen
 *       onBack={() => window.history.back()}
 *       onSelect={(key) => console.log('Selected:', key)}
 *     />
 *   );
 * }
 */
