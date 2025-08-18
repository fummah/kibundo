import React from "react";
import { Card, Col, Row, Statistic, Space, Button, Grid, Skeleton } from "antd";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader.jsx";

const { useBreakpoint } = Grid;

export default function AcademicsOverview() {
  const navigate = useNavigate();
  const screens = useBreakpoint();

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Academics"
        subtitle="Manage curricula, subjects, quizzes, worksheets and the AI Agent."
        extra={
          <Space wrap>
            <Button onClick={() => navigate("/admin/academics/subjects")}>Subjects</Button>
            <Button type="primary" onClick={() => navigate("/admin/academics/curricula")}>Manage Curricula</Button>
          </Space>
        }
      />

      <div className="p-3 md:p-4">
        <Row gutter={[16, 16]}>
          {[{t:"Curricula"},{t:"Subjects"},{t:"Quizzes"}].map((k, i) => (
            <Col key={i} xs={24} sm={12} md={8}>
              <Card hoverable className="h-full">
                <Statistic title={k.t} valueRender={() => <Skeleton.Input active size="small" style={{ width: 80 }} />} />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16,16]} className="mt-2">
          <Col xs={24} md={8}>
            <Card title="Curricula" hoverable>
              <Space wrap>
                <Button type="primary" onClick={() => navigate("/admin/academics/curricula")}>Open</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Teaching Assets" hoverable>
              <Space wrap>
                <Button onClick={() => navigate("/admin/academics/worksheet")}>Worksheets</Button>
                <Button onClick={() => navigate("/admin/academics/quiz")}>Quizzes</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="AI Agent" hoverable>
              <Space wrap>
                <Button onClick={() => navigate("/admin/academics/ai-agent")}>Manage &amp; Train</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
