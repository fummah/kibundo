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
} from "antd";
import {
  StarOutlined,
  EditOutlined,
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
                <span>{classData.userCreated?.username || classData.userCreated?.email || "Unknown"}</span>
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
        <div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/academics/grades/${id}/edit`)}
          >
            Edit Class
          </Button>
        </div>
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
