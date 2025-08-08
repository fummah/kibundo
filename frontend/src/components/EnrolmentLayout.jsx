// src/components/EnrolmentLayout.jsx
import {
  Row, Col, Input, Select, Button, Table, Typography, Dropdown, Menu, Popconfirm, Space,
} from "antd";
import {
  SearchOutlined, PlusOutlined, MoreOutlined, EditOutlined,
  EyeOutlined, DeleteOutlined,
} from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

export const EnrolmentLayout = ({
  title,
  data,
  fullData,
  setFiltered,
  role,
  onAddClick,
  onView,
  onEdit,
  onDelete,
}) => {
  const handleSearch = (value) => {
    const filtered = fullData.filter((item) =>
      `${item.firstName} ${item.lastName}`.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(filtered);
  };

  const handleStatusFilter = (value) => {
    if (value === "all") setFiltered(fullData);
    else setFiltered(fullData.filter((item) => item.status === value));
  };

  const columns = [
    {
      title: "Name",
      render: (_, record) => `${record.firstName} ${record.lastName}`,
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
      render: (grade) => Array.isArray(grade) ? grade.join(", ") : grade,
    },
    {
      title: "Subjects",
      dataIndex: "subjects",
      render: (subjects) => subjects?.join(", ") || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item icon={<EyeOutlined />} onClick={() => onView(record)}>View</Menu.Item>
              <Menu.Item icon={<EditOutlined />} onClick={() => onEdit(record)}>Edit</Menu.Item>
              <Menu.Item danger icon={<DeleteOutlined />}>
                <Popconfirm title="Are you sure?" onConfirm={() => onDelete(record.id)}>
                  Delete
                </Popconfirm>
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
    <>
      <Row justify="space-between" className="mb-4">
        <Col><Title level={3}>{title}</Title></Col>
        <Col>
          <Space>
            <Select defaultValue="all" onChange={handleStatusFilter}>
              <Option value="all">All</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
            <Input.Search
              placeholder="Search by name"
              allowClear
              onSearch={handleSearch}
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddClick}>
              Add {role === "teacher" ? "Teacher" : "Student"}
            </Button>
          </Space>
        </Col>
      </Row>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </>
  );
};
