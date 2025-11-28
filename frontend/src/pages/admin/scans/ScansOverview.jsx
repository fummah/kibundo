import { Card, Row, Col, Statistic, Button } from "antd";
import { FileSearchOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios";

const fetchScansStats = async () => {
  const { data } = await api.get("/homeworkscans");
  const scans = Array.isArray(data) ? data : [];
  
  const total = scans.length;
  const completed = scans.filter(s => s.completed_at || s.completion_photo_url).length;
  const pending = total - completed;
  
  return { total, completed, pending };
};

export default function ScansOverview() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["scansStats"],
    queryFn: fetchScansStats,
  });

  const cards = [
    {
      title: "Total Scans",
      value: stats?.total || 0,
      icon: <FileSearchOutlined style={{ fontSize: 32, color: "#1677ff" }} />,
      color: "#1677ff",
    },
    {
      title: "Completed",
      value: stats?.completed || 0,
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a" }} />,
      color: "#52c41a",
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: "#faad14" }} />,
      color: "#faad14",
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Scans Overview</h1>
        <p className="text-gray-600">Manage and view all homework scans</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {cards.map((card, idx) => (
          <Col xs={24} sm={12} lg={8} key={idx}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              size="large"
              onClick={() => navigate("/admin/scans/homework")}
            >
              View All Homework Scans
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

