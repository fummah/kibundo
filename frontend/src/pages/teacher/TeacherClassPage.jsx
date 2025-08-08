import { useState } from "react";
import {
  Tabs,
  Avatar,
  Card,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;

export default function TeacherClassPage() {
  const [students, setStudents] = useState([
    { name: "Ethan Carter", group: "Group 1", img: "https://i.pravatar.cc/300?img=1" },
    { name: "Olivia Bennett", group: "Group 2", img: "https://i.pravatar.cc/300?img=2" },
    { name: "Noah Thompson", group: "Group 1", img: "https://i.pravatar.cc/300?img=3" },
  ]);

  const [groups, setGroups] = useState([
    { name: "Group 1", students: ["Ethan Carter", "Noah Thompson"] },
    { name: "Group 2", students: ["Olivia Bennett"] },
  ]);

  const [assignments, setAssignments] = useState([
    { title: "Math Quiz", due: "2025-08-05", status: "Pending", type: "Quiz" },
    { title: "English Essay", due: "2025-08-10", status: "Completed", type: "Essay" },
  ]);

  const [isAssignModalVisible, setAssignModalVisible] = useState(false);
  const [isStudentModalVisible, setStudentModalVisible] = useState(false);
  const [isGroupModalVisible, setGroupModalVisible] = useState(false);

  const [assignForm] = Form.useForm();
  const [studentForm] = Form.useForm();
  const [groupForm] = Form.useForm();

  const handleCreateAssignment = () => {
    assignForm.validateFields().then((values) => {
      setAssignments([
        ...assignments,
        {
          title: values.title,
          due: dayjs(values.due).format("YYYY-MM-DD"),
          status: values.status,
          type: values.type,
        },
      ]);
      assignForm.resetFields();
      setAssignModalVisible(false);
      message.success(`${values.type} created successfully`);
    });
  };

  const handleAddStudent = () => {
    studentForm.validateFields().then((values) => {
      const newStudent = {
        name: values.name,
        group: values.group,
        img: `https://i.pravatar.cc/300?u=${values.name}`,
      };
      setStudents([...students, newStudent]);
      setGroups((prev) =>
        prev.map((g) =>
          g.name === values.group
            ? { ...g, students: [...g.students, values.name] }
            : g
        )
      );
      studentForm.resetFields();
      setStudentModalVisible(false);
      message.success("Student added");
    });
  };

  const handleAddGroup = () => {
    groupForm.validateFields().then((values) => {
      setGroups([...groups, { name: values.name, students: [] }]);
      groupForm.resetFields();
      setGroupModalVisible(false);
      message.success("Group added");
    });
  };

  return (
    <div className="bg-white p-6 min-h-screen rounded-lg shadow">
      <div className="mb-6">
        <Title level={3}>📘 Class 1 Dashboard</Title>
        <Text type="secondary">Manage students, groups, and assignments</Text>
      </div>

      <Tabs defaultActiveKey="students" type="card">
        {/* STUDENTS */}
        <TabPane tab="Students" key="students">
          <Row gutter={[16, 16]}>
            {students.map((student, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card hoverable>
                  <div className="flex items-center gap-3">
                    <Avatar size={48} src={student.img} />
                    <div>
                      <div className="font-semibold">{student.name}</div>
                      <Tag color="green">{student.group}</Tag>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="mt-6"
            onClick={() => setStudentModalVisible(true)}
          >
            Add Student
          </Button>
        </TabPane>

        {/* GROUPS */}
        <TabPane tab="Groups" key="groups">
          <Row gutter={[16, 16]}>
            {groups.map((group, index) => (
              <Col xs={24} md={12} key={index}>
                <Card title={group.name} hoverable>
                  <p className="text-sm text-gray-600">Students:</p>
                  <ul className="list-disc ml-4 text-sm">
                    {group.students.map((student, idx) => (
                      <li key={idx}>{student}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
            ))}
          </Row>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="mt-6"
            onClick={() => setGroupModalVisible(true)}
          >
            Add Group
          </Button>
        </TabPane>

        {/* ASSIGNMENTS */}
        <TabPane tab="Assignments" key="assignments">
          <Row gutter={[16, 16]}>
            {assignments.map((task, index) => (
              <Col xs={24} sm={12} key={index}>
                <Card
                  title={
                    <>
                      {task.title}{" "}
                      <Tag color={task.type === "Essay" ? "purple" : "blue"} className="ml-2">
                        {task.type}
                      </Tag>
                    </>
                  }
                  extra={<Tag color={task.status === "Completed" ? "green" : "orange"}>{task.status}</Tag>}
                  hoverable
                >
                  <p className="text-sm text-gray-600">Due Date: {task.due}</p>
                </Card>
              </Col>
            ))}
          </Row>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="mt-6"
            onClick={() => setAssignModalVisible(true)}
          >
            Create Assignment
          </Button>
        </TabPane>
      </Tabs>

      {/* Assignment Modal */}
      <Modal
        title="Create Assignment"
        open={isAssignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={handleCreateAssignment}
        okText="Create"
        centered
      >
        <Form layout="vertical" form={assignForm}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please enter title" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Type"
            name="type"
            initialValue="Quiz"
            rules={[{ required: true, message: "Please select type" }]}
          >
            <Select>
              <Option value="Quiz">Quiz</Option>
              <Option value="Essay">Essay</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Due Date"
            name="due"
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            initialValue="Pending"
            rules={[{ required: true, message: "Please select status" }]}
          >
            <Select>
              <Option value="Pending">Pending</Option>
              <Option value="Completed">Completed</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Student Modal */}
      <Modal
        title="Add Student"
        open={isStudentModalVisible}
        onCancel={() => setStudentModalVisible(false)}
        onOk={handleAddStudent}
        okText="Add"
        centered
      >
        <Form layout="vertical" form={studentForm}>
          <Form.Item
            label="Student Name"
            name="name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Group"
            name="group"
            rules={[{ required: true, message: "Please select group" }]}
          >
            <Select>
              {groups.map((g, idx) => (
                <Option key={idx} value={g.name}>
                  {g.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Group Modal */}
      <Modal
        title="Add Group"
        open={isGroupModalVisible}
        onCancel={() => setGroupModalVisible(false)}
        onOk={handleAddGroup}
        okText="Add"
        centered
      >
        <Form layout="vertical" form={groupForm}>
          <Form.Item
            label="Group Name"
            name="name"
            rules={[{ required: true, message: "Enter group name" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
