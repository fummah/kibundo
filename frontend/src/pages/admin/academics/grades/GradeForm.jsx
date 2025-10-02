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

  // ---------- Load Grade when editing ----------
  const loadGrade = useCallback(async () => {
    if (!isEdit) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/grades/${id}`);

      // Normalize & set form fields
      form.setFieldsValue({
        name: data?.name ?? "",
        code: data?.code ?? "",
        description: data?.description ?? "",
        class_id: data?.class_id ?? undefined,
        is_active: typeof data?.is_active === "boolean" ? data.is_active : true,
      });

      if (topbar?.update) {
        topbar.update({
          title: `Edit Grade: ${data?.name || ""}`,
          breadcrumbs: [
            { title: "Admin", path: "/admin" },
            { title: "Academics", path: "/admin/academics" },
            { title: "Grades", path: "/admin/academics/grades" },
            { title: `Edit: ${data?.name || ""}` },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to load grade:", err);
      message.error("Failed to load grade details.");
      navigate("/admin/academics/grades");
    } finally {
      setLoading(false);
    }
  }, [form, id, isEdit, navigate, topbar]);

  // ---------- Topbar (create mode) ----------
  useEffect(() => {
    if (!isEdit && topbar?.update) {
      topbar.update({
        title: "Add New Grade",
        breadcrumbs: [
          { title: "Admin", path: "/admin" },
          { title: "Academics", path: "/admin/academics" },
          { title: "Grades", path: "/admin/academics/grades" },
          { title: "Add New" },
        ],
      });
    }
  }, [isEdit, topbar]);

  // ---------- Bootstrapping ----------
  useEffect(() => {
    loadClasses();
    loadGrade();
  }, [loadClasses, loadGrade]);

  // ---------- Submit ----------
  const onFinish = async (values) => {
    const payload = {
      name: values.name?.trim(),
      class_id: values.class_id ?? null,
      is_active: !!values.is_active,
    };

    try {
      setSubmitting(true);

      if (isEdit) {
        await api.put(`/grades/${id}`, payload);
        message.success("Grade updated successfully.");
      } else {
        await api.post("/grades", payload);
        message.success("Grade created successfully.");
      }

      navigate("/admin/academics/grades");
    } catch (error) {
      console.error("Error saving grade:", error);
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to save grade. Please try again.";
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
            {isEdit ? "Edit Grade" : "Add New Grade"}
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
            name: "",
            class_id: undefined,
            is_active: true,
          }}
          autoComplete="off"
          className="grade-form"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              name="name"
              label="Grade Name"
              rules={[
                { required: true, message: "Please enter grade name" },
                { max: 100, message: "Name cannot exceed 100 characters" },
              ]}
            >
              <Input placeholder="e.g. Grade 1, Grade 2, etc." />
            </Form.Item>

            <Form.Item
              name="class_id"
              label="Class"
              rules={[
                { required: true, message: "Please select a class" },
              ]}
            >
              <Select
                showSearch
                placeholder="Select a class"
                optionFilterProp="label"
                loading={fetchingClasses}
                notFoundContent={fetchingClasses ? <Spin size="small" /> : null}
                suffixIcon={<TeamOutlined />}
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={(classes || []).map((cls) => ({
                  value: cls.id,
                  label: classLabel(cls),
                }))}
              />
            </Form.Item>

            <Form.Item
              name="is_active"
              label="Status"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
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
                {isEdit ? "Update" : "Create"} Grade
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
