import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Typography,
  Button,
  Upload,
  Modal,
  DatePicker,
  Select,
  Progress,
  message,
  Calendar,
  Row,
  Col,
} from "antd";
import {
  UploadOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import api from "../../api/axios";

const { Title } = Typography;
const { Option } = Select;

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [gradesChartData, setGradesChartData] = useState([]);
  const [subjectsChartData, setSubjectsChartData] = useState([]);

  useEffect(() => {
    api
      .get("/api/assignments")
      .then((res) => {
        setAssignments(res.data);
        prepareChartData(res.data);
      })
      .catch(() => message.error("Failed to load assignments"));
  }, []);

  const prepareChartData = (data) => {
    const byGrade = {};
    const bySubject = {};

    data.forEach(({ grade, subject, score }) => {
      byGrade[grade] = byGrade[grade] || [];
      byGrade[grade].push(score);
      bySubject[subject] = bySubject[subject] || [];
      bySubject[subject].push(score);
    });

    const format = (obj) =>
      Object.entries(obj).map(([key, arr]) => ({
        name: key,
        average: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      }));

    setGradesChartData(format(byGrade));
    setSubjectsChartData(format(bySubject));
  };

  const handleAIGrade = (record) => {
    message.loading("Running AI grading...");
    setTimeout(() => {
      const newAssignments = assignments.map((a) =>
        a.id === record.id ? { ...a, score: Math.floor(80 + Math.random() * 20) } : a
      );
      setAssignments(newAssignments);
      prepareChartData(newAssignments);
      message.success("Grading complete!");
    }, 1200);
  };

  const columns = [
    {
      title: "Assignment",
      dataIndex: "title",
    },
    {
      title: "Subject",
      dataIndex: "subject",
    },
    {
      title: "Grade",
      dataIndex: "grade",
    },
    {
      title: "Student",
      dataIndex: "student",
    },
    {
      title: "Teacher",
      dataIndex: "teacher",
    },
    {
      title: "Submission Date",
      dataIndex: "submissionDate",
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Score",
      dataIndex: "score",
      render: (score) => <Progress percent={score} size="small" />,
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Button
          type="link"
          icon={<FileDoneOutlined />}
          onClick={() => handleAIGrade(record)}
        >
          AI Grade
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen dark:bg-gray-900">
      <Title level={2} className="text-gray-900 dark:text-white mb-4">
        📝 Assignments
      </Title>

      <Table
        dataSource={assignments}
        columns={columns}
        rowKey="id"
        bordered
        pagination={{ pageSize: 5 }}
      />

      <Row gutter={[16, 16]} className="mt-8">
        <Col xs={24} md={12}>
          <Card title="📊 Score by Grade" className="dark:bg-gray-800">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradesChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="📚 Score by Subject" className="dark:bg-gray-800">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectsChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="📆 Deadlines Calendar" className="mt-6 dark:bg-gray-800">
        <Calendar fullscreen={false} />
      </Card>
    </div>
  );
}
