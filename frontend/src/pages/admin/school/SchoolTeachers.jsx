import { useState } from "react";
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Dropdown,
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
import AddTeacherDrawer from "../../../components/schools/AddTeacherDrawer";
import ViewTeacherDrawer from "../../../components/schools/ViewTeacherDrawer.jsx";
import EditTeacherDrawer from "../../../components/schools/EditTeacherDrawer";

const { Option } = Select;

const mockTeachers = [
  {
    key: "1",
    name: "Mr. Moyo",
    email: "moyo@example.com",
    phone: "+27612345678",
    subject: ["Math"],
    grade: "Grade 4",
    status: "Active",
  },
  {
    key: "2",
    name: "Mrs. Ndlovu",
    email: "ndlovu@example.com",
    phone: "+27698765432",
    subject: ["Science", "English"],
    grade: "Grade 5",
    status: "Inactive",
  },
];

export default function SchoolTeachers() {
  const [teachers, setTeachers] = useState(mockTeachers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [addDrawerVisible, setAddDrawerVisible] = useState(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);

  const filteredData = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || teacher.status === statusFilter;
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
      title: "Subject",
      dataIndex: "subject",
      render: (subjects) =>
        subjects.map((subj, index) => (
          <Tag key={index} color="purple">
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
      render: (_, teacher) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "view",
                label: "View",
                icon: <EyeOutlined />,
                onClick: () => {
                  setSelectedTeacher(teacher);
                  setViewDrawerVisible(true);
                },
              },
              {
                key: "edit",
                label: "Edit",
                icon: <EditOutlined />,
                onClick: () => {
                  setSelectedTeacher(teacher);
                  setEditDrawerVisible(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  setTeachers((prev) =>
                    prev.filter((t) => t.key !== teacher.key)
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
      title="👨‍🏫 School Teachers"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddDrawerVisible(true)}
        >
          Add Teacher
        </Button>
      }
      className="shadow-md"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <Input.Search
          placeholder="Search teachers"
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

      {/* Drawers */}
      <AddTeacherDrawer
        open={addDrawerVisible}
        onClose={() => setAddDrawerVisible(false)}
      />
      <ViewTeacherDrawer
        open={viewDrawerVisible}
        onClose={() => setViewDrawerVisible(false)}
        teacher={selectedTeacher}
      />
      <EditTeacherDrawer
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        teacher={selectedTeacher}
      />
    </Card>
  );
}
