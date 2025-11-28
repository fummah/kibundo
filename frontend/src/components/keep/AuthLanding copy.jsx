import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Typography,
  Button,
  Row,
  Col,
  Card,
} from "antd";
import {
  RocketOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setDarkMode(localStorage.getItem("theme") === "dark");
  }, []);

  const layoutClasses = `min-h-screen w-full flex flex-col ${
    darkMode ? "dark bg-gray-900 text-white" : "bg-white text-gray-800"
  }`;

  return (
    <Layout className={layoutClasses}>
      <Content className="flex-grow">

        {/* 🚀 Hero Section */}
        <section className="bg-gradient-to-tr from-blue-50 to-purple-100 dark:from-gray-800 dark:to-gray-900 py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <Title className="text-3xl md:text-5xl font-bold text-blue-800 dark:text-white">
              Empower Learning. Empower Lives.
            </Title>
            <Text className="block mt-4 mb-8 text-base md:text-lg text-gray-700 dark:text-gray-300">
              Kibundo is a powerful, user-friendly LMS for schools, tutors, parents, and learners.
            </Text>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button type="primary" size="large" onClick={() => navigate("/signup")}>
                Start Now
              </Button>
              <Button size="large" onClick={() => navigate("/signin")}>
                Anmelden
              </Button>
            </div>
          </div>
        </section>

        {/* 🔒 Features Section */}
        <section className="py-16 px-4 sm:px-6 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <Title level={2} className="text-center text-blue-600 dark:text-blue-400 mb-10">
              Why Choose Kibundo?
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={8}>
                <Card variant="outlined" className="shadow-lg rounded-lg h-full dark:bg-gray-800">
                  <RocketOutlined className="text-4xl text-blue-500 mb-4" />
                  <Title level={4} className="dark:text-white">Fast & Intuitive</Title>
                  <Text className="dark:text-gray-300">
                    Quick onboarding and a clean, easy-to-use interface for every user.
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card variant="outlined" className="shadow-lg rounded-lg h-full dark:bg-gray-800">
                  <SafetyOutlined className="text-4xl text-green-500 mb-4" />
                  <Title level={4} className="dark:text-white">Secure & Reliable</Title>
                  <Text className="dark:text-gray-300">
                    Your data is encrypted and stored safely with industry best practices.
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card variant="outlined" className="shadow-lg rounded-lg h-full dark:bg-gray-800">
                  <TeamOutlined className="text-4xl text-purple-500 mb-4" />
                  <Title level={4} className="dark:text-white">Multi-role Access</Title>
                  <Text className="dark:text-gray-300">
                    Separate dashboards for students, teachers, parents, and admins.
                  </Text>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        {/* ✅ Call to Action */}
        <section className="bg-blue-600 dark:bg-blue-700 text-white py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Title level={2} className="text-white text-2xl sm:text-3xl md:text-4xl">
              Ready to get started?
            </Title>
            <Text className="block text-base md:text-lg mb-6">
              Sign up now and transform your learning experience with Kibundo LMS.
            </Text>
            <Button size="large" type="default" onClick={() => navigate("/signup")}>
              Konto erstellen
            </Button>
          </div>
        </section>

      </Content>
    </Layout>
  );
}
