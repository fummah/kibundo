import { useState } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Modal,
  Form,
  DatePicker,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

const initialSchools = [
  {
    key: 1,
    name: "Green Valley Primary",
    teachers: ["Mrs. Ndlovu", "Mr. Moyo"],
    licenseExpiry: "2025-12-31",
    status: "Active",
  },
  {
    key: 2,
    name: "Bright Future Academy",
    teachers: ["Ms. Sibanda"],
    licenseExpiry: "2024-05-15",
    status: "Expired",
  },
];

export default function Schools() {
  const [schools, setSchools] = useState(initialSchools);
  const [filtered, setFiltered] = useState(initialSchools);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = (value) => {
    setSearch(value);
    setFiltered(
      schools.filter((s) =>
        s.name.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  const handleAddSchool = (values) => {
    const newSchool = {
      key: Date.now(),
      name: values.name,
      teachers: values.teachers,
      licenseExpiry: values.licenseExpiry.format("YYYY-MM-DD"),
      status: "Active",
    };
    const updated = [...schools, newSchool];
    setSchools(updated);
    setFiltered(updated);
    setModalOpen(false);
    form.resetFields();
  };

  const columns = [
    {
      title: "School Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Assigned Teachers",
      dataIndex: "teachers",
      key: "teachers",
      render: (teachers) => teachers.join(", "),
    },
    {
      title: "License Expiry",
      dataIndex: "licenseExpiry",
      key: "licenseExpiry",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Title level={3}>🏫 School Licenses & Access</Title>
      <p className="text-gray-600">
        Manage school accounts, assign teachers/students, track license expiry and branding preferences.
      </p>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Input.Search
          placeholder="Search schools..."
          allowClear
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Add School
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 5 }}
        scroll={{ x: true }}
      />

      {/* Add Modal */}
      <Modal
        title="Add School"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Save"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddSchool}
        >
          <Form.Item
            label="School Name"
            name="name"
            rules={[{ required: true, message: "Please enter the school name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Assigned Teachers"
            name="teachers"
            rules={[{ required: true, message: "Select at least one teacher" }]}
          >
            <Select mode="tags" placeholder="Type teacher names" />
          </Form.Item>
          <Form.Item
            label="License Expiry"
            name="licenseExpiry"
            rules={[{ required: true, message: "Choose expiry date" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
