import { useState } from "react";
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Button,
  Typography,
  Space,
  message,
  Upload,
  Empty,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

// ✅ Corrected path
import AddSchoolDrawer from "../../../components/schools/AddSchoolDrawer";

const { Title } = Typography;
const { Option } = Select;

const dummySchools = [
  {
    name: "Green Valley High",
    slug: "green-valley-high",
    logo: "https://placehold.co/100x100",
    type: "Public",
    category: "Secondary",
    students: 200,
    teachers: 20,
    location: "Cape Town",
  },
  {
    name: "Bright Future Academy",
    slug: "bright-future-academy",
    logo: "https://placehold.co/100x100",
    type: "Private",
    category: "Primary",
    students: 150,
    teachers: 15,
    location: "Johannesburg",
  },
];

export default function SchoolSelector() {
  const [schools, setSchools] = useState(dummySchools);
  const [filtered, setFiltered] = useState(dummySchools);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = useNavigate();

  const handleSearch = () => {
    const filteredResults = schools.filter((school) => {
      const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || school.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || school.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
    setFiltered(filteredResults);
  };

  const handleAddSchool = (newSchool) => {
    const updated = [...schools, newSchool];
    setSchools(updated);
    setFiltered(updated);
    message.success("School added!");
  };

  const goToDashboard = (slug) => {
    navigate(`/admin/schools/${slug}/dashboard`);
  };

  return (
    <div className="px-6 py-4">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={3}>🏫 Select a School</Title>
        </Col>
        <Col>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setDrawerOpen(true)}>
            Add School
          </Button>
        </Col>
      </Row>

      <Row gutter={16} className="mb-4">
        <Col xs={24} md={6}>
          <Input
            placeholder="Search school"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col xs={12} md={6}>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: "100%" }}
          >
            <Option value="all">All Types</Option>
            <Option value="Public">Public</Option>
            <Option value="Private">Private</Option>
          </Select>
        </Col>
        <Col xs={12} md={6}>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: "100%" }}
          >
            <Option value="all">All Categories</Option>
            <Option value="Primary">Primary</Option>
            <Option value="Secondary">Secondary</Option>
          </Select>
        </Col>
        <Col xs={24} md={6}>
          <Button
            type="default"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            block
          >
            Search
          </Button>
        </Col>
      </Row>

      {filtered.length === 0 ? (
        <Empty description="No schools found" />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((school) => (
            <Col xs={24} sm={12} md={8} lg={6} key={school.slug}>
              <Card
                hoverable
                onClick={() => goToDashboard(school.slug)}
                cover={<img alt="logo" src={school.logo} style={{ height: 150, objectFit: "cover" }} />}
              >
                <Title level={5}>{school.name}</Title>
                <p>{school.location}</p>
                <Space>
                  <span>📘 {school.students} students</span>
                  <span>👩‍🏫 {school.teachers} teachers</span>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <AddSchoolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={handleAddSchool}
      />
    </div>
  );
}
