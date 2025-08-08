import { useNavigate } from "react-router-dom";
import { Typography, Button, Card, Row, Col } from "antd";
import {
  ReadOutlined,
  BarChartOutlined,
  BookOutlined,
  LoginOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function GuestPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 to-purple-100 px-6 py-10 text-gray-800">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <Title>Welcome to Kibundo</Title>
        <Paragraph className="text-lg">
          Explore our platform as a guest! Preview student progress, learning tools,
          and dashboards before creating an account.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <ReadOutlined style={{ fontSize: 32, color: "#3b82f6" }} />
            <Title level={4}>Learning Tools</Title>
            <Paragraph>Access fun, interactive learning activities and quizzes.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <BarChartOutlined style={{ fontSize: 32, color: "#10b981" }} />
            <Title level={4}>Progress Tracking</Title>
            <Paragraph>See how progress is visualized for kids through maps and charts.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <BookOutlined style={{ fontSize: 32, color: "#f59e0b" }} />
            <Title level={4}>Parent & Teacher Views</Title>
            <Paragraph>See how teachers and parents track and manage learners.</Paragraph>
          </Card>
        </Col>
      </Row>

      <div className="text-center mt-10">
        <Button
          type="primary"
          icon={<LoginOutlined />}
          size="large"
          onClick={() => navigate("/choose-role")}
          className="rounded-full bg-indigo-600 hover:bg-indigo-700"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}
