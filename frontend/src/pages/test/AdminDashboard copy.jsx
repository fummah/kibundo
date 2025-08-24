// src/pages/admin/AdminDashboard.jsx
import { Card, Button, Row, Col } from "antd";
import { FileTextOutlined, DatabaseOutlined, BookOutlined, SettingOutlined, PieChartOutlined } from "@ant-design/icons";

export default function AdminDashboard() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Master Support Interface</h1>

      {/* Platform Overview */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <p className="text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">12,500</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <p className="text-gray-500">Parents</p>
              <p className="text-2xl font-bold">750</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <p className="text-gray-500">Reports Generated</p>
              <p className="text-2xl font-bold">320</p>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Key Functionalities */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Key Functionalities</h2>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <PieChartOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <p className="font-semibold mt-2">Statistics Dashboard</p>
              <p className="text-gray-500 text-sm">Access real-time platform usage statistics.</p>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <p className="font-semibold mt-2">Report Generation</p>
              <p className="text-gray-500 text-sm">Generate detailed reports on user activity and performance.</p>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <p className="font-semibold mt-2">Contract Management</p>
              <p className="text-gray-500 text-sm">Manage contracts with schools and institutions.</p>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <DatabaseOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <p className="font-semibold mt-2">Database Management</p>
              <p className="text-gray-500 text-sm">Oversee and manage the platform's database.</p>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <BookOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <p className="font-semibold mt-2">Educational Philosophy</p>
              <p className="text-gray-500 text-sm">Review the core educational principles guiding the platform.</p>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-x-4">
          <Button type="primary">Generate Report</Button>
          <Button>Manage Contracts</Button>
        </div>
      </section>
    </div>
  );
}
