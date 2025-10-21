// src/pages/admin/academics/grades/GradeForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Form, Input, Button, Card, message, Switch, Select, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import {
  StarOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";
import { useTopbar } from "@/components/layouts/GlobalLayout.jsx";

const { TextArea } = Input;

const classLabel = (cls) => {
  if (!cls) return "";
  return cls.name || cls.class_name || (cls.id ? `Class #${cls.id}` : "");
};

export default function GradeForm() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const topbar = useTopbar();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  // ---------- Fetch Classes (for class_id select) ----------
  const loadClasses = useCallback(async () => {
    try {
      setFetchingClasses(true);
      const { data } = await api.get("/allclasses");
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load classes:", err);
      message.error("Failed to load classes.");
    } finally {
      setFetchingClasses(false);
    }
  }, []);

  // ---------- Load Class when editing ----------
  const loadClass = useCallback(async () => {
    if (!isEdit) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/class/${id}`);

      // Normalize & set form fields
      form.setFieldsValue({
        class_name: data?.class_name ?? "",
      });

      if (topbar?.update) {
        topbar.update({
          title: `Edit Class: ${data?.class_name || data?.name || ""}`,
          breadcrumbs: [
            { title: "Admin", path: "/admin" },
            { title: "Academics", path: "/admin/academics" },
            { title: "Classes", path: "/admin/academics/grades" },
            { title: `Edit: ${data?.class_name || data?.name || ""}` },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to load class:", err);
      message.error("Failed to load class details.");
      navigate("/admin/academics/grades");
    } finally {
      setLoading(false);
    }
  }, [form, id, isEdit, navigate, topbar]);

  // ---------- Topbar (create mode) ----------
  useEffect(() => {
    if (!isEdit && topbar?.update) {
      topbar.update({
        title: "Add New Class",
        breadcrumbs: [
          { title: "Admin", path: "/admin" },
          { title: "Academics", path: "/admin/academics" },
          { title: "Classes", path: "/admin/academics/grades" },
          { title: "Add New" },
        ],
      });
    }
  }, [isEdit, topbar]);

  // ---------- Bootstrapping ----------
  useEffect(() => {
    loadClasses();
    loadClass();
  }, [loadClasses, loadClass]);

  // ---------- Submit ----------
  const onFinish = async (values) => {
    const payload = {
      class_name: values.class_name?.trim(),
    };

    try {
      setSubmitting(true);

      if (isEdit) {
        await api.put(`/class/${id}`, payload);
        message.success("Class updated successfully.");
      } else {
        await api.post("/addclass", payload);
        message.success("Class created successfully.");
      }

      navigate("/admin/academics/grades");
    } catch (error) {
      console.error("Error saving class:", error);
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to save class. Please try again.";
      message.error(apiMsg);
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card
        title={
          <div className="flex items-center gap-2">
            <StarOutlined />
            {isEdit ? "Edit Class" : "Add New Class"}
          </div>
        }
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/admin/academics/grades")}
          >
            Back to List
          </Button>
        }
        loading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            class_name: "",
          }}
          autoComplete="off"
          className="class-form"
        >
          <div className="grid grid-cols-1 gap-6">
            <Form.Item
              name="class_name"
              label="Class Name"
              rules={[
                { required: true, message: "Please enter class name" },
                { max: 100, message: "Name cannot exceed 100 characters" },
              ]}
            >
              <Input placeholder="e.g. Class 1, Class 2, etc." />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => navigate("/admin/academics/grades")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
              >
                {isEdit ? "Update" : "Create"} Class
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
