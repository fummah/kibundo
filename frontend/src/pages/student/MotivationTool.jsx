// src/pages/student/MotivationTool.jsx
import { Typography } from "antd";
import MotivationTimer from "@/components/student/MotivationTimer.jsx";
const { Title } = Typography;
export default function MotivationTool() {
  return (
    <div className="px-3 md:px-6 py-4">
      <Title level={4}>Focus & Motivation</Title>
      <MotivationTimer />
    </div>
  );
}
