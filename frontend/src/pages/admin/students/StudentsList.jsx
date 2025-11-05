// src/pages/students/StudentsList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Space, App, Modal } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";
import api from "@/api/axios";
import { batchUpdateAgeAndGrade } from "@/utils/studentAgeGrade";

export default function StudentsList() {
  const { message, modal } = App.useApp();
  const [updating, setUpdating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAutoUpdateAgeAndGrade = async () => {
    modal.confirm({
      title: "Auto-Update Age and Grade",
      content: "This will update age and grade for all students based on their current age and class information. Continue?",
      okText: "Update All",
      cancelText: "Cancel",
      onOk: async () => {
        setUpdating(true);
        try {
          // Fetch all students
          const { data: studentsData } = await api.get("/allstudents");
          const students = Array.isArray(studentsData) ? studentsData : (studentsData?.data || []);

          if (students.length === 0) {
            message.warning("No students found to update");
            return;
          }

          // Calculate updates for each student
          const updates = batchUpdateAgeAndGrade(students, {
            useDateOfBirth: false, // We don't have DOB in the model
            useClassName: true,
          });

          if (updates.length === 0) {
            message.info("No students need updates");
            return;
          }

          // Update each student
          let successCount = 0;
          let errorCount = 0;

          for (const update of updates) {
            try {
              const payload = {};
              if (update.age !== undefined) payload.age = update.age;
              if (update.grade !== undefined) payload.grade = update.grade;

              await api.put(`/students/${update.studentId}`, payload);
              successCount++;
            } catch (error) {
              console.error(`Failed to update student ${update.studentId}:`, error);
              errorCount++;
            }
          }

          if (successCount > 0) {
            message.success(`Successfully updated ${successCount} student(s)`);
            // Trigger refresh by changing key
            setRefreshKey(prev => prev + 1);
          }

          if (errorCount > 0) {
            message.warning(`Failed to update ${errorCount} student(s)`);
          }
        } catch (error) {
          console.error("Error auto-updating age and grade:", error);
          message.error("Failed to auto-update age and grade");
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <Space>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={handleAutoUpdateAgeAndGrade}
            loading={updating}
          >
            Auto-Update Age & Grade
          </Button>
        </Space>
      </div>
      <EntityList
        key={refreshKey}
        cfg={{
          entityKey: "students",
          titlePlural: "Students",
          titleSingular: "Student",
          routeBase: "/admin/students",
          idField: "id",
          api: {
            listPath: "/allstudents",
            updateStatusPath: (id) => `/student/${id}/status`,
            removePath: (id) => `/student/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : [];
            const fallback = (v) =>
              v === undefined || v === null || String(v).trim() === "" ? "-" : String(v).trim();

            return src.map((student) => {
              const user = student.user || {};
              const parent = student.parent || {};
              const parentUser = parent?.user || {};

              const fullName = fallback([user.first_name, user.last_name].filter(Boolean).join(" "));
              const schoolName = fallback(
                student.school?.name || student.school_name || student.school
              );
              const grade = fallback(
                student.class?.class_name || student.class_name || student.grade || user.grade
              );

              // Use the same logic as StudentDetail (lines 130-146)
              let parentName = "-";
              let parentEmail = "-";
              let parentId = null;

              if (parent) {
                const possibleNames = [
                  [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ").trim(),
                  parent.name,
                  parentUser.name,
                  parentUser.username,
                  parent.username,
                ].filter(Boolean);
                parentName = possibleNames[0] || (parent.id ? `Parent #${parent.id}` : "-");
                parentEmail = parentUser.email || parent.email || parentUser.username || parent.username || "-";
                parentId = parent.id || null;
              }

              return {
                id: student.id,
                name: fullName,
                grade,
                parent_name: parentName,
                parent_email: parentEmail,
                parent_id: parentId, // used only to build the Link
                school: schoolName,
                state: user.state || student.state || "-",
                status: fallback(user.status || student.status),
                created_at: user.created_at || student.created_at,
                raw: student,
              };
            });
          },
        },
        statusFilter: true,
        billingFilter: false,

        columnsMap: () => ({
          status: F.status("status"),
          id: F.idLink("ID", "/admin/students", "id"),
          name: F.text("Full Name", "name"),
          grade: F.text("Grade", "grade"),
          state: F.text("State", "state"),
          created_at: F.date("Date added", "created_at"),
        }),

        // No Parent ID column
        defaultVisible: [
          "status",
          "id",
          "name",
          "grade",
          "state",
          "created_at",
        ],

        rowClassName: (r) =>
          r.status === "active"
            ? "row-status-active"
            : r.status === "suspended"
            ? "row-status-suspended"
            : r.status === "disabled"
            ? "row-status-disabled"
            : "",
      }}
      />
    </div>
  );
}
