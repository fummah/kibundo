import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  CodeOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { Typography, Card, Row, Col, Radio, Button } from "antd";

const { Title, Paragraph } = Typography;

const roles = [
  {
    key: "student",
    title: "Student",
    description: "Access learning materials and assignments.",
    icon: <UserOutlined style={{ fontSize: 24, color: "#3b82f6" }} />,
  },
  {
    key: "teacher",
    title: "Teacher",
    description: "Manage courses, quizzes, and track students.",
    icon: <ReadOutlined style={{ fontSize: 24, color: "#10b981" }} />,
  },
  {
    key: "parent",
    title: "Parent",
    description: "Monitor your child’s learning progress.",
    icon: <TeamOutlined style={{ fontSize: 24, color: "#f43f5e" }} />,
  },
  {
    key: "developer",
    title: "Developer",
    description: "Submit apps, games, and view analytics.",
    icon: <CodeOutlined style={{ fontSize: 24, color: "#f59e0b" }} />,
  },
  {
    key: "support",
    title: "Support",
    description: "Assist users and resolve tickets.",
    icon: <CustomerServiceOutlined style={{ fontSize: 24, color: "#6366f1" }} />,
  },
];

export default function ChooseRole() {
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedRole) return;
    navigate(`/signup?role=${selectedRole}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white px-6 py-10 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        <Title level={2} className="text-center mb-8 text-black dark:text-white">
          Who are you?
        </Title>

        <Radio.Group
          onChange={(e) => setSelectedRole(e.target.value)}
          value={selectedRole}
          className="w-full"
        >
          <Row gutter={[16, 16]}>
            {roles.map((role) => (
              <Col xs={24} sm={12} md={8} key={role.key}>
                <Card
                  hoverable
                  className={`transition duration-200 ${
                    selectedRole === role.key
                      ? "border-blue-500 ring-2 ring-blue-300"
                      : "border-gray-200"
                  }`}
                  onClick={() => setSelectedRole(role.key)}
                >
                  <div className="flex items-start gap-3">
                    {role.icon}
                    <div className="flex-1">
                      <Title level={5}>{role.title}</Title>
                      <Paragraph type="secondary">{role.description}</Paragraph>
                    </div>
                    <Radio value={role.key} />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Radio.Group>

        <Button
          type="primary"
          block
          size="large"
          className="mt-8 rounded-full bg-yellow-400 text-black hover:bg-yellow-500"
          disabled={!selectedRole}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
