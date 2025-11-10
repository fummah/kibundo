// src/pages/admin/academics/grades/GradeDetail.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Space,
  Divider,
  Tabs,
  message,
  Dropdown,
  Modal,
} from "antd";
import {
  StarOutlined,
  EditOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  UserOutlined, // ✅ was missing
} from "@ant-design/icons";
import api from "@/api/axios";
import { useTopbar } from "@/components/layouts/GlobalLayout.jsx";

export default function GradeDetail() {
  const { id } = useParams();
  const navigate = useNavigate(); // ✅ was missing
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const topbar = useTopbar();

  // Helper to format class label consistently
  const classLabel = useCallback((c) => {
    if (!c) return "—";
    return (
      c.class_name ||
      c.name ||
      (c.id ? `Class #${c.id}` : "—")
    );
  }, []);

  const fetchClassInfo = useCallback(
    async (classId) => {
      if (!classId) return;
      try {
        // Preferred: direct class endpoint
        const { data: cls } = await api.get(`/class/${classId}`);
        setClassInfo(cls);
      } catch (e) {
        // Fallback: search in /allclasses
        try {
          const { data: all } = await api.get("/allclasses");
          const found =
            Array.isArray(all) ? all.find((c) => Number(c.id) === Number(classId)) : null;
          if (found) setClassInfo(found);
        } catch (err) {
          // Silent; we’ll just show N/A
          console.error("Failed to load classes from /allclasses:", err);
        }
      }
    },
    []
  );

  const loadClass = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/class/${id}`);
      setClassData(data);

      // Fetch related class (using your provided endpoints)
      if (data?.class) {
        setClassInfo(data.class);
      } else if (data?.class_id) {
        await fetchClassInfo(data.class_id);
      }

      if (topbar && typeof topbar.update === "function") {
        topbar.update({
          title: `Class: ${data?.class_name || data?.name || "Details"}`,
          breadcrumbs: [
            { title: "Admin", path: "/admin" },
            { title: "Academics", path: "/admin/academics" },
            { title: "Classes", path: "/admin/academics/grades" },
            { title: data?.class_name || data?.name || "Details" },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to load class:", error);
      message.error("Failed to load class details");
      navigate("/admin/academics/grades");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, topbar, fetchClassInfo]);

  useEffect(() => {
    if (topbar && typeof topbar.update === "function") {
      topbar.update({
        title: `Class Details`,
        breadcrumbs: [
          { title: "Admin", path: "/admin" },
          { title: "Academics", path: "/admin/academics" },
          { title: "Classes", path: "/admin/academics/grades" },
          { title: "Details" },
        ],
      });
    }
    loadClass();
  }, [id, topbar, loadClass]);

  const createdByDisplay = (() => {
    if (!classData) return "—";
    const user =
      classData.userCreated ||
      classData.createdBy ||
      classData.created_by_user ||
      classData.owner ||
      classData.user;

    if (user && typeof user === "object") {
      const first =
        user.first_name ||
        user.firstName ||
        user.given_name ||
        user.name_first ||
        "";
      const last =
        user.last_name ||
        user.lastName ||
        user.family_name ||
        user.name_last ||
        "";
      const full = `${first} ${last}`.trim();
      return (
        full ||
        user.username ||
        user.email ||
        user.name ||
        user.display_name ||
        "—"
      );
    }

    return (
      classData.created_by_name ||
      classData.created_by ||
      classData.createdBy ||
      "—"
    );
  })();

  const handleDelete = useCallback(() => {
    if (!classData?.id) return;
    Modal.confirm({
      title: "Delete Grade",
      content: `Are you sure you want to delete "${classData.class_name || classData.name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await api.delete(`/class/${classData.id}`);
          message.success("Grade deleted successfully");
          navigate("/admin/academics/grades");
        } catch (error) {
          console.error("Failed to delete grade:", error);
          const msg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Failed to delete grade";
          message.error(msg);
        }
      },
    });
  }, [classData, navigate]);

  const handleActionClick = useCallback(
    ({ key }) => {
      if (key === "create") {
        navigate("/admin/academics/grades/new");
        return;
      }
      if (key === "delete") {
        handleDelete();
      }
    },
    [navigate, handleDelete]
  );

  if (!classData) return null;

  const tabs = [
    {
      key: "overview",
      label: (
        <span>
          <BookOutlined /> Overview
        </span>
      ),
      children: (
        <Card className="mt-4" loading={loading}>
          <Descriptions bordered column={1} className="custom-descriptions">
            <Descriptions.Item label="Class Name">
              <div className="font-medium">{classData.class_name}</div>
            </Descriptions.Item>

            <Descriptions.Item label="Class ID">
              <Tag color="blue">{classData.id}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Created By">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-blue-500" />
                <span>{createdByDisplay}</span>
              </div>
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              <div className="flex items-center text-gray-500">
                <ClockCircleOutlined className="mr-1" />
                {classData.created_at
                  ? new Date(classData.created_at).toLocaleString()
                  : "—"}
              </div>
            </Descriptions.Item>

            {classData.updated_at && classData.updated_at !== classData.created_at && (
              <Descriptions.Item label="Last Updated">
                <div className="flex items-center text-gray-500">
                  <ClockCircleOutlined className="mr-1" />
                  {new Date(classData.updated_at).toLocaleString()}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ),
    },
    {
      key: "students",
      label: (
        <span>
          <UserOutlined /> Students
        </span>
      ),
      children: (
        <Card className="mt-4">
          <div className="text-center py-8 text-gray-400">
            <p>Student enrollment data will be displayed here.</p>
            <p className="text-sm mt-2">
              This section will show all students enrolled in this grade.
            </p>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/admin/academics/grades")}
            className="flex items-center"
          >
            Back to Grades
          </Button>
          <h1 className="text-2xl font-bold mt-2 flex items-center">
            <StarOutlined className="mr-2 text-blue-500" />
            {classData.class_name || classData.name || "Class"}
          </h1>
          {classData.id && (
            <div className="text-gray-500 text-sm mt-1">
              ID: <span className="font-mono">{classData.id}</span>
            </div>
          )}
        </div>
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/academics/grades/${id}/edit`)}
          >
            Edit Class
          </Button>
          <Dropdown
            trigger={["click"]}
            menu={{
              onClick: handleActionClick,
              items: [
                {
                  key: "create",
                  icon: <PlusOutlined />,
                  label: "Create Grade",
                },
                {
                  type: "divider",
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: <span className="text-red-500">Delete Grade</span>,
                },
              ],
            }}
          >
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space>
      </div>

      {/* AntD v5: Tabs use `items` instead of TabPane */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={tabs} />

      <Divider />

      <div className="flex justify-between mt-6">
        <Button onClick={() => navigate("/admin/academics/grades")}>
          Back to Grades
        </Button>
        <Space>
        <Button onClick={() => navigate(`/admin/academics/grades/${id}/edit`)}>
          Edit Class
        </Button>
        </Space>
      </div>
    </div>
  );
}
