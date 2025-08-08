import { useState } from "react";
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Dropdown,
  Space,
  Select,
  Menu,
} from "antd";
import {
  PlusOutlined,
  DownOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import AddStudentDrawer from "../../../components/schools/AddStudentDrawer";
import ViewStudentDrawer from "../../../components/schools/ViewStudentDrawer";
import EditStudentModal from "../../../components/schools/EditStudentDrawer";

const { Option } = Select;

const mockData = [
  {
    key: "1",
    name: "Tariro Zulu",
    email: "tariro.zulu@example.com",
    phone: "+27612345678",
    grade: "Grade 4",
    subjects: ["Math", "English"],
    status: "Active",
  },
  {
    key: "2",
    name: "Thabo Moyo",
    email: "thabo.moyo@example.com",
    phone: "+27698765432",
    grade: "Grade 5",
    subjects: ["Science", "Life Skills"],
    status: "Inactive",
  },
];

export default function SchoolStudents() {
  const [students, setStudents] = useState(mockData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addDrawerVisible, setAddDrawerVisible] = useState(false);

  const filteredData = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Grade", dataIndex: "grade" },
    {
      title: "Subjects",
      dataIndex: "subjects",
      render: (subjects) =>
        subjects.map((subj, index) => (
          <Tag key={index} color="blue">
            {subj}
          </Tag>
        )),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      render: (_, student) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "view",
                label: "View",
                icon: <EyeOutlined />,
                onClick: () => {
                  setSelectedStudent(student);
                  setViewDrawerVisible(true);
                },
              },
              {
                key: "edit",
                label: "Edit",
                icon: <EditOutlined />,
                onClick: () => {
                  setSelectedStudent(student);
                  setEditModalVisible(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  setStudents((prev) =>
                    prev.filter((s) => s.key !== student.key)
                  );
                },
              },
            ],
          }}
        >
          <Button size="small">
            Actions <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <Card
      title="🎓 School Students"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddDrawerVisible(true)}
        >
          Add Student
        </Button>
      }
      className="shadow-md"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <Input.Search
          placeholder="Search students"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: "100%", maxWidth: 300 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
        >
          <Option value="All">All</Option>
          <Option value="Active">Active</Option>
          <Option value="Inactive">Inactive</Option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          rowClassName="whitespace-nowrap"
          scroll={{ x: "max-content" }}
        />
      </div>

      {/* Drawers and Modals */}
      <AddStudentDrawer
        open={addDrawerVisible}
        onClose={() => setAddDrawerVisible(false)}
      />
      <ViewStudentDrawer
        open={viewDrawerVisible}
        onClose={() => setViewDrawerVisible(false)}
        student={selectedStudent}
      />
      <EditStudentModal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        student={selectedStudent}
      />
    </Card>
  );
}