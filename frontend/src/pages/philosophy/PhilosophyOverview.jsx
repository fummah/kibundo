import { useEffect, useState } from "react";
import { Typography, Row, Col, Card, Spin, Divider } from "antd";
import Lottie from "lottie-react";
import signupLottie from "../../assets/signuolotie.json";
import signup2Lottie from "../../assets/signup2.json";
import learningBot from "../../assets/learning-bot.json";
import axios from "axios";

const { Title, Paragraph, Text } = Typography;

export default function PhilosophyPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/philosophy/blogs") // Your backend endpoint
      .then((res) => setBlogs(res.data))
      .catch(() => console.error("Failed to fetch blogs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 min-h-screen bg-white dark:bg-gray-900 dark:text-white">
      <Title level={2} className="text-center mb-4">
        📘 Educational Philosophy
      </Title>

      <Row gutter={[24, 24]} className="mb-10">
        <Col xs={24} md={12}>
          <Paragraph className="text-lg leading-relaxed">
            At Kibundo, we believe learning should be:
            <ul className="list-disc pl-6 mt-2">
              <li>Child-centric and inclusive</li>
              <li>Driven by curiosity and inquiry</li>
              <li>Supported by technology and community</li>
            </ul>
            Our mission is to empower every learner with the skills, confidence,
            and creativity to thrive in a dynamic world.
          </Paragraph>
        </Col>
        <Col xs={24} md={12}>
          <Lottie animationData={signupLottie} loop style={{ height: 250 }} />
        </Col>
      </Row>

      <Divider />

      {/* Vision Animation Section */}
      <Row gutter={[24, 24]} className="mb-10">
        <Col xs={24} md={12}>
          <Lottie animationData={signup2Lottie} loop style={{ height: 250 }} />
        </Col>
        <Col xs={24} md={12}>
          <Title level={4}>Our Vision</Title>
          <Paragraph>
            We envision a world where every child can access personalized
            learning regardless of their background. Our curriculum and
            technology blend to ensure progress tracking, adaptive learning, and
            positive reinforcement.
          </Paragraph>
        </Col>
      </Row>

      <Divider />

      {/* News / Blog Section */}
      <Title level={3} className="mt-8 mb-4">📰 News & Blog</Title>
      {loading ? (
        <Spin size="large" />
      ) : (
        <Row gutter={[16, 16]}>
          {blogs.map((item, idx) => (
            <Col xs={24} md={12} lg={8} key={idx}>
              <Card
                hoverable
                cover={
                  <img
                    alt={item.title}
                    src={item.image}
                    className="h-48 w-full object-cover rounded-t-md"
                  />
                }
              >
                <Title level={5}>{item.title}</Title>
                <Text type="secondary">
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <Paragraph className="mt-2">
                  {item.content.length > 120
                    ? item.content.slice(0, 120) + "..."
                    : item.content}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Divider className="my-8" />

      {/* Footer Animation */}
      <div className="text-center">
        <Lottie animationData={learningBot} loop style={{ height: 220 }} />
      </div>
    </div>
  );
}
