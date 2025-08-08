import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Dropdown,
  Select,
  message,
  Statistic,
  Row,
  Col,
  Divider,
  Spin,
  Tooltip,
  Space,
} from "antd";
import {
  PlusOutlined,
  DownOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../api/axios";
import AddStudentDrawer from "../../components/schools/AddStudentDrawer";
import ViewStudentDrawer from "../../components/schools/ViewStudentDrawer";
import EditStudentDrawer from "../../components/schools/EditStudentDrawer";

const { Option } = Select;

export default function StudentEnrolment() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState("All");
  const statuses = ["Active", "Inactive", "Pending", "Approved", "Rejected"];

  const [selected, setSelected] = useState(null);
  const [addDrawerVisible, setAddDrawerVisible] = useState(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get("/allstudents");
      const fallback = (val) => (val ? val : "-");

      const normalized = res.data.map((student) => ({
        id: student.id,
        firstName: fallback(student.user.first_name),
        lastName: fallback(student.user.last_name),
        email: fallback(student.user.email),
        phone: fallback(student.user.contact_number),
        class_name: fallback(student.class?.class_name),
        status: fallback(student.user?.status),
        user_id: student.user_id,
        class_id: student.class_id,
        created_at: student.created_at,
        subjects: Array.isArray(student.subjects) ? student.subjects : ["-"],
      }));

      setStudents(normalized);
      setFiltered(normalized);
    } catch (err) {
      console.error("Failed to fetch students", err);
      message.error("Could not load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    let results = [...students];

    if (statusFilter !== "All") {
      results = results.filter((s) => s.status === statusFilter);
    }

    if (dateRange !== "All") {
      const days = parseInt(dateRange);
      const cutoff = dayjs().subtract(days, "day");
      results = results.filter((s) => dayjs(s.created_at).isAfter(cutoff));
    }

    if (search.trim()) {
      results = results.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(results);
  }, [search, statusFilter, dateRange, students]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      message.success("Student deleted");
      fetchStudents();
    } catch (err) {
      console.error("Failed to delete student", err);
      message.error("Failed to delete student.");
    }
  };

  const handleStatusToggle = async (student) => {
    if (["Approved", "Rejected"].includes(student.status)) {
      message.warning(`Status change disabled for ${student.status}`);
      return;
    }

    try {
      const newStatus = student.status === "Active" ? "Inactive" : "Active";

      await api.put(`/users/${student.user_id}/status`, { status: newStatus });

      await api.post(`/students/${student.id}/notes`, {
        note: `Status changed from ${student.status} to ${newStatus}`,
        author: "Admin",
      });

      message.success(`Status updated to ${newStatus}`);
      fetchStudents();
    } catch (err) {
      console.error("Status update error", err);
      message.error("Failed to update status.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "green";
      case "Inactive":
        return "red";
      case "Pending":
        return "orange";
      case "Approved":
        return "blue";
      case "Rejected":
        return "volcano";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: "Name",
      render: (_, record) => (
        <span className="font-semibold">{`${record.firstName} ${record.lastName}`}</span>
      ),
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
      dataIndex: "class_name",
    },
   
    {
      title: "Status",
      dataIndex: "status",
      render: (status, student) => (
        <Tooltip
          title={
            ["Approved", "Rejected"].includes(status)
              ? "Cannot change Approved or Rejected status"
              : "Click to toggle between Active/Inactive"
          }
        >
          <Tag
            color={getStatusColor(status)}
            style={{
              cursor: ["Approved", "Rejected"].includes(status)
                ? "not-allowed"
                : "pointer",
            }}
            onClick={() => handleStatusToggle(student)}
          >
            {status}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Date Added",
      dataIndex: "created_at",
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
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
                  setSelected(student);
                  setViewDrawerVisible(true);
                },
              },
              {
                key: "edit",
                label: "Edit",
                icon: <EditOutlined />,
                onClick: () => {
                  setSelected(student);
                  setEditDrawerVisible(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDelete(student.id),
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

  const total = students.length;
  const active = students.filter((s) => s.status === "Active").length;
  const inactive = students.filter((s) => s.status === "Inactive").length;

  return (
    <Card className="shadow-md" bodyStyle={{ padding: 24 }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-700">📘 Student Enrolment</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddDrawerVisible(true)}
          className="mt-4 md:mt-0"
        >
          Add Student
        </Button>
      </div>


      <Divider className="mb-6" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <Space wrap>
          <Input.Search
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="All">All</Option>
            {statuses.map((status) => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>
          <Select value={dateRange} onChange={setDateRange} style={{ width: 150 }}>
            <Option value="All">All Time</Option>
            <Option value="7">Last 7 Days</Option>
            <Option value="30">Last 30 Days</Option>
            <Option value="90">Last 90 Days</Option>
          </Select>
        </Space>
      </div>

      <Spin spinning={loading}>
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 5 }}
            rowKey="id"
            scroll={{ x: "max-content" }}
          />
        </div>
      </Spin>

      {/* Drawers */}
      <AddStudentDrawer
        open={addDrawerVisible}
        onClose={() => {
          setAddDrawerVisible(false);
          fetchStudents();
        }}
       postUrl="/addstudent"
      />
      <ViewStudentDrawer
        open={viewDrawerVisible}
        onClose={() => setViewDrawerVisible(false)}
        student={selected}
      />
      <EditStudentDrawer
        open={editDrawerVisible}
        onCancel={() => setEditDrawerVisible(false)}
        student={selected}
        refresh={fetchStudents}
      />
    </Card>
  );
}
