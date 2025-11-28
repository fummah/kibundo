// src/pages/admin/scans/HomeworkScansList.jsx
import { useNavigate } from "react-router-dom";
import EntityList from "@/components/EntityList.jsx";
import { columnFactories as F } from "@/components/entityList/columnFactories.jsx";
import { Tag } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const CompletionStatus = ({ scan }) => {
  const isCompleted = scan.completed_at || scan.completion_photo_url;
  if (isCompleted) {
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        Completed
      </Tag>
    );
  }
  return (
    <Tag color="orange" icon={<ClockCircleOutlined />}>
      Pending
    </Tag>
  );
};

export default function HomeworkScansList() {
  return (
    <EntityList
      cfg={{
        entityKey: "homeworkScans",
        titlePlural: "Homework Scans",
        titleSingular: "Homework Scan",
        routeBase: "/admin/scans/homework",
        idField: "id",
        api: {
          listPath: "/homeworkscans",
          removePath: (id) => `/homeworkscans/${id}`,
          parseList: (data) => {
            const src = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            const fb = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

            return src.map((scan) => {
              // Extract student name from nested relationship
              let studentName = "-";
              if (scan.student) {
                const student = scan.student;
                const studentUser = student.user || {};
                const firstName = studentUser.first_name || "";
                const lastName = studentUser.last_name || "";
                const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
                studentName = fullName || studentUser.name || studentUser.email || "-";
              } else if (scan.student_id) {
                // If student relationship is missing but student_id exists, show ID
                studentName = `Student #${scan.student_id}`;
              }

              // Extract grade from student's class if not directly on scan
              let grade = scan.grade;
              if (!grade && scan.student?.class?.class_name) {
                grade = scan.student.class.class_name;
              }

              return {
                id: scan.id,
                student_id: scan.student_id,
                student_name: fb(studentName),
                detected_subject: fb(scan.detected_subject),
                task_type: fb(scan.task_type),
                grade: fb(grade),
                created_at: scan.created_at,
                completed_at: scan.completed_at,
                completion_photo_url: scan.completion_photo_url,
                file_url: scan.file_url,
                raw_text: scan.raw_text,
                notes: scan.notes,
                raw: scan,
              };
            });
          },
        },
        statusFilter: false,
        billingFilter: false,
        showAddButton: false,

        columnsMap: (navigate) => ({
          id: {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 90,
            sorter: (a, b) => (a?.id || 0) - (b?.id || 0),
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/scans/homework/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/scans/homework/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          student_name: {
            title: "Student",
            dataIndex: "student_name",
            key: "student_name",
            render: (v, row) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/admin/scans/homework/${row.id}`, { state: { prefill: row } });
                }}
                href={`/admin/scans/homework/${row.id}`}
              >
                {v}
              </a>
            ),
          },

          detected_subject: F.text("Subject", "detected_subject"),
          task_type: F.text("Task Type", "task_type"),
          grade: F.text("Grade", "grade"),

          completion_status: {
            title: "Status",
            key: "completion_status",
            width: 120,
            render: (_, row) => <CompletionStatus scan={row} />,
          },

          created_at: {
            title: "Created",
            dataIndex: "created_at",
            key: "created_at",
            width: 180,
            render: (v) => formatDate(v),
            sorter: (a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateA - dateB;
            },
          },

          completed_at: {
            title: "Completed",
            dataIndex: "completed_at",
            key: "completed_at",
            width: 180,
            render: (v) => formatDate(v),
            sorter: (a, b) => {
              const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
              const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
              return dateA - dateB;
            },
          },
        }),

        defaultVisible: [
          "id",
          "student_name",
          "detected_subject",
          "task_type",
          "completion_status",
          "created_at",
        ],
      }}
    />
  );
}

