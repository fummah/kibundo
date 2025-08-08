// src/pages/admin/TeacherEnrolment.jsx
import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Dropdown,
  message,
} from "antd";
import {
  PlusOutlined,
  DownOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import AddTeacherDrawer from "../../components/schools/AddTeacherDrawer";
import ViewTeacherDrawer from "../../components/schools/ViewTeacherDrawer";
import EditTeacherDrawer from "../../components/schools/EditTeacherDrawer";
import api from "../../api/axios";

export default function TeacherEnrolment() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [addDrawerVisible, setAddDrawerVisible] = useState(false);

  const fetchTeachers = async () => {
  try {
    const res = await api.get("/allteachers");
    console.log("Teacher API Response:", res.data);

    const normalized = res.data.map((teacher) => {
      const user = teacher.user ?? {};
      const classData = teacher.class ?? {};

      return {
        id: teacher.id,
        name: `${teacher.user.first_name || "-"} ${teacher.user.last_name || "-"}`,
        email: teacher.user.email || "-",
        phone: teacher.user.contact_number || "-",
        status: teacher.user.status || "-",
        grade: teacher.class.class_name || "-", 
      };
    });

    setTeachers(normalized);
  } catch (err) {
    console.error("Failed to fetch teachers", err);
    message.error("Error fetching teacher data");
  }
};


  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAdd = async (formValues) => {
    try {
      await api.post("/teachers", formValues); // ✅ Correct POST path
      message.success("Teacher added successfully");
      fetchTeachers();
    } catch (err) {
      console.error("Add teacher error:", err);
      message.error("Failed to add teacher");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teachers/${id}`); // ✅ Correct DELETE path
      message.success("Teacher deleted successfully");
      fetchTeachers();
    } catch (err) {
      console.error("Delete error:", err);
      message.error("Failed to delete teacher");
    }
  };

  const filteredData = teachers.filter(
    (teacher) =>
      teacher.name?.toLowerCase().includes(search.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
    },
    {
      title: "Grade",
      dataIndex: "grade",
    },
    
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "volcano"}>
          {status || "-"}
        </Tag>
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
                onClick: () => handleDelete(teacher.id),
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
      title="👨‍🏫 Teacher Enrolment"
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
      </div>

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          rowKey="id"
          scroll={{ x: "max-content" }}
        />
      </div>

      {/* Drawers */}
      <AddTeacherDrawer
        open={addDrawerVisible}
        onClose={() => setAddDrawerVisible(false)}
        onAdd={handleAdd}
      />
      <ViewTeacherDrawer
        open={viewDrawerVisible}
        onClose={() => setViewDrawerVisible(false)}
        teacher={selectedTeacher}
      />
      <EditTeacherDrawer
        open={editDrawerVisible}
        onClose={() => {
          setEditDrawerVisible(false);
          fetchTeachers();
        }}
        teacher={selectedTeacher}
      />
    </Card>
  );
}
