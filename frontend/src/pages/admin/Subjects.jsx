import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Typography,
  Select,
  Menu,
  Dropdown,
  Card,
} from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../../api/axios";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

export default function SubjectsAdminPage() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchSubjects();
    fetchClasses();

    const interval = setInterval(() => {
      fetchSubjects();
    }, 15000); // refresh every 15 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  const fetchSubjects = async () => {
    const res = await api.get("/allsubjects");
    setSubjects(res.data);
  };

  const fetchClasses = async () => {
    const res = await api.get("/allclasses");
    setClasses(res.data);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredSubjects = subjects.filter((subject) => {
  const matchesSearch =
    subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.userCreated.first_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass =
    selectedClass === "All" || subject.class?.class_name === selectedClass;

  return matchesSearch && matchesClass;
});

  const openCreate = () => {
    form.resetFields();
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    form.setFieldsValue({
      subject_name: record.subject_name,
      class_id: record.class_id,
    });
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    const payload = {
      subject_name: values.subject_name,
      class_id: values.class_id,
      created_by: 2,
    };

    try {
      if (editing) {
        await api.put(`/subjects/${editing.id}`, payload);
      } else {
        await api.post("/addsubject", payload);
      }

      fetchSubjects();
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/subjects/${id}`);
      fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: "Subject Name",
      dataIndex: "subject_name",
      key: "subject_name",
    },
    {
      title: "Class",
      key: "class",
      render: (_, record) => record.class?.class_name || "—",
    },
    {
      title: "Created By",
      key: "created_by",
      render: (_, record) =>
        record.userCreated
          ? `${record.userCreated.first_name} ${record.userCreated.last_name}`
          : "—",
    },
    {
      title: "Date Added",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          overlay={
            <Menu>
              <Menu.Item icon={<EditOutlined />} onClick={() => openEdit(record)}>
                Edit
              </Menu.Item>
              <Menu.Item icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>
                Delete
              </Menu.Item>
            </Menu>
          }
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <Title level={4} className="mb-0">
            Subjects / List
          </Title>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage all subjects in the system
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Subject
        </Button>
      </div>

      <Card className="shadow-sm rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2 px-2">
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={selectedClass}
              onChange={(value) => setSelectedClass(value)}
              style={{ width: 150 }}
            >
              <Option value="All">All</Option>
              {classes.map((cls) => (
                <Option key={cls.id} value={cls.class_name}>
                  {cls.class_name}
                </Option>
              ))}
            </Select>

            <Select
              value={pageSize}
              onChange={(value) => setPageSize(Number(value))}
              style={{ width: 100 }}
            >
              <Option value="10">10</Option>
              <Option value="25">25</Option>
              <Option value="100">100</Option>
            </Select>
          </div>

          <Input.Search
            allowClear
            placeholder="Search subject..."
            onChange={handleSearch}
            style={{ maxWidth: 250 }}
          />
        </div>

        <div className="overflow-x-auto">
          <Table
            rowKey="id"
            dataSource={filteredSubjects}
            columns={columns}
            pagination={{ pageSize }}
            scroll={{ x: true }}
          />
        </div>
      </Card>

      <Drawer
        title={editing ? "Edit Subject" : "Add Subject"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={window.innerWidth < 768 ? "100%" : 480}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleSubmit} form={form}>
          <Form.Item
            name="subject_name"
            label="Subject Name"
            rules={[
              { required: true, message: "Enter subject name" },
              {
                validator: async (_, value) => {
                  const trimmed = value?.trim().toLowerCase();
                  const classId = form.getFieldValue("class_id");

                  if (!trimmed || !classId) return Promise.resolve();

                  const duplicate = subjects.find((subj) => {
                    return (
                      subj.subject_name.trim().toLowerCase() === trimmed &&
                      subj.class_id === classId &&
                      (!editing || subj.id !== editing.id)
                    );
                  });

                  if (duplicate) {
                    return Promise.reject(
                      new Error("Subject already exists for the selected class.")
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="e.g., English" />
          </Form.Item>

          <Form.Item
            name="class_id"
            label="Class"
            rules={[{ required: true, message: "Select a class" }]}
          >
            <Select placeholder="Choose class">
              {classes.map((cls) => (
                <Option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
