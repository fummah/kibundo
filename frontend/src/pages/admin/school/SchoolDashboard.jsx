import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Typography,
  Card,
  Row,
  Col,
  Spin,
  message,
  Button,
  List,
  Tag,
  Select,
  Avatar,
  Space,
} from "antd";
import {
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  PlusOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import api from "../../../api/axios";
import AddTeacherDrawer from "../../../components/schools/AddTeacherDrawer";
import AddStudentDrawer from "../../../components/schools/AddStudentDrawer";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const dummyAttendance = [
  { month: "Jan", attendance: 92 },
  { month: "Feb", attendance: 89 },
  { month: "Mar", attendance: 95 },
  { month: "Apr", attendance: 91 },
  { month: "May", attendance: 94 },
  { month: "Jun", attendance: 87 },
];

const dummyEvents = [
  { title: "PTA Meeting Scheduled", type: "info" },
  { title: "New Student Enrolment Opened", type: "success" },
  { title: "Science Fair - Next Friday", type: "warning" },
];

const COLORS = ["#36CFC9", "#9254DE"];

export default function SchoolDashboard() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addTeacherVisible, setAddTeacherVisible] = useState(false);
  const [addStudentVisible, setAddStudentVisible] = useState(false);

  useEffect(() => {
    api
      .get(`/schools/${schoolSlug}/dashboard`)
      .then((res) => {
        setSchool(res.data);
        setLoading(false);
      })
      .catch(() => {
        message.warning("Error loading school data. Using fallback.");
        setSchool({
          name: "Dummy Academy",
          teacherCount: null,
          studentCount: null,
          licenseExpiry: null,
          logo: null,
          lastLogin: null,
          description: null,
        });
        setLoading(false);
      });
  }, [schoolSlug]);

  useEffect(() => {
    api
      .get("/api/schools")
      .then((res) => setSchools(res.data))
      .catch(() =>
        setSchools([
          { name: "Dummy Academy", slug: "dummy-academy" },
          { name: "Smart High", slug: "smart-high" },
        ])
      );
  }, []);

  const handleSchoolChange = (slug) => {
    navigate(`/admin/schools/${slug}/dashboard`);
  };

  if (loading) return <Spin size="large" className="mt-12 ml-12" />;

  const pieData = [
    { name: "Students", value: school?.studentCount || 0 },
    { name: "Teachers", value: school?.teacherCount || 0 },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <Row justify="space-between" align="middle" className="mb-4">
        <Col xs={24} md={12}>
          <Space align="start" size="middle" className="flex-wrap">
            <Avatar
              size={64}
              src={school?.logo || "https://via.placeholder.com/80"}
              alt="School Logo"
            />
            <div>
              <Title level={3} className="mb-0">
                {school?.name || "-"}
              </Title>
              <Text type="secondary">
                Last Login: {school?.lastLogin || "-"}
              </Text>
            </div>
          </Space>
        </Col>
        <Col xs={24} md={12} className="flex flex-col sm:flex-row gap-2 justify-end mt-4 sm:mt-0">
          <Select
            value={schoolSlug}
            style={{ minWidth: 180 }}
            onChange={handleSchoolChange}
          >
            {schools.map((s) => (
              <Option key={s.slug} value={s.slug}>
                {s.name}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* Description */}
      <Paragraph type="secondary" className="mb-4">
        {school?.description || "No description available."}
      </Paragraph>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <UserOutlined className="text-3xl text-blue-500 mb-2" />
            <Title level={4}>{school?.teacherCount ?? "-"}</Title>
            <p>Teachers</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <TeamOutlined className="text-3xl text-green-500 mb-2" />
            <Title level={4}>{school?.studentCount ?? "-"}</Title>
            <p>Students</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <CalendarOutlined className="text-3xl text-purple-500 mb-2" />
            <Title level={4}>
              {school?.licenseExpiry
                ? new Date(school.licenseExpiry).toLocaleDateString()
                : "-"}
            </Title>
            <p>License Expiry</p>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="📈 Monthly Attendance Trends" hoverable>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dummyAttendance}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="🥧 Student-Teacher Ratio" hoverable>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Actions & Notifications */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} md={12}>
          <Card title="⚡ Quick Actions" hoverable>
            <Space wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddTeacherVisible(true)}
              >
                Add Teacher
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setAddStudentVisible(true)}
              >
                Add Student
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="🔔 School Notifications" hoverable>
            <List
              dataSource={dummyEvents}
              renderItem={(item) => (
                <List.Item>
                  <BellOutlined className="mr-2 text-blue-500" />
                  <Tag color={getColorByType(item.type)}>{item.title}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Drawers */}
      <AddTeacherDrawer
        open={addTeacherVisible}
        onClose={() => setAddTeacherVisible(false)}
      />
      <AddStudentDrawer
        open={addStudentVisible}
        onClose={() => setAddStudentVisible(false)}
      />
    </div>
  );
}

function getColorByType(type) {
  switch (type) {
    case "success":
      return "green";
    case "info":
      return "blue";
    case "warning":
      return "orange";
    default:
      return "gray";
  }
}
