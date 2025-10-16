// src/pages/students/StudentDetail.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Button, Tag, message, Modal, Select } from "antd";
import { PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import api from "@/api/axios";

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

export default function StudentDetail() {
  // Read location once, but freeze the prefill so later URL/tab changes don't trigger work
  const location = useLocation();
  const prefillRef = useRef(location.state?.prefill || null);

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [assignSubjectModalVisible, setAssignSubjectModalVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Fetch available subjects once
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/allsubjects");
        setAvailableSubjects(Array.isArray(data) ? data : []);
      } catch (err) {
        message.error("Failed to load available subjects");
      }
    })();
  }, []);

  // Helpers for endpoints used by the Subjects tab
  const apiPaths = useMemo(
    () => ({
      getStudent: (id) => `/student/${id}`,
      assignSubject: (studentId, subjectId) => `/student/${studentId}/subject/${subjectId}`,
      unlinkSubject: (studentId, subjectId) => `/student/${studentId}/subject/${subjectId}`,
    }),
    []
  );

  // Assign a subject to a student
  const handleAssignSubject = useCallback(
    async (studentId) => {
      if (!selectedSubjectId) return;
      setAssigning(true);
      try {
        await api.post(apiPaths.assignSubject(studentId, selectedSubjectId));
        message.success("Subject assigned successfully");
        setAssignSubjectModalVisible(false);
        setSelectedSubjectId(null);
        // Let EntityDetail re-fetch by using its built-in Reload button; or you can signal via events if supported.
      } catch (err) {
        message.error(err?.response?.data?.message || "Failed to assign subject");
      } finally {
        setAssigning(false);
      }
    },
    [selectedSubjectId, apiPaths]
  );

  // Remove (unlink) subject from student
  const handleRemoveSubject = useCallback(
    async (studentId, subjectId) => {
      try {
        await api.delete(apiPaths.unlinkSubject(studentId, subjectId));
        message.success("Subject removed successfully");
        // Again, rely on the tab's reload action if available.
      } catch (err) {
        message.error(err?.response?.data?.message || "Failed to remove subject");
      }
    },
    [apiPaths]
  );

  // Stable config object (does not depend on location)
  const cfg = useMemo(() => ({
    titleSingular: "Student",
    idField: "id",
    routeBase: "/admin/students",

    // Optional: give EntityDetail a hint to keep tab panes mounted (if it supports it)
    tabsProps: { destroyOnHidden: false, animated: false },

    api: {
      getPath: (id) => `/student/${id}`,
      updateStatusPath: (id) => `/student/${id}/status`,
      removePath: (id) => `/student/${id}`,
      getSubjectsPath: "/allsubjects",
      getSubjectPath: (id) => `/subject/${id}`,
      assignSubjectPath: (studentId, subjectId) => `/student/${studentId}/subject/${subjectId}`,
      removeSubjectPath: (studentId, subjectId) => `/student/${studentId}/subject/${subjectId}`,

      parseEntity: (payload) => {
        const s = payload?.data ?? payload ?? {};
        const user = s.user || {};
        const parent = s.parent || {};
        const parentUser = parent?.user || {};
        const fb = (v) =>
          v === undefined || v === null || String(v).trim() === "" ? "-" : String(v).trim();

        const name = fb([user.first_name, user.last_name].filter(Boolean).join(" "));
        const email = fb(user.email);
        const grade = fb(s.class?.class_name || s.class_name || s.grade || user.grade);
        const school = fb(s.school?.name || s.school_name || s.school);
        const state = fb(user.state || s.state);

        // Subjects: accept either array of subjects or array of links containing subject
        const rawSubjects = Array.isArray(s.subjects)
          ? s.subjects
          : Array.isArray(s.subject)
          ? s.subject
          : [];
        
        const subjectsArray = rawSubjects.map((it) => {
          if (it?.subject) return it.subject; // link { subject: {...} }
          return it; // already subject
        });

        const subjectsText =
          subjectsArray.length > 0
            ? subjectsArray
                .map((it) => it?.subject_name || it?.name)
                .filter(Boolean)
                .join(", ")
            : "-";

        // Parent summary
        let parentName = "-";
        let parentEmail = "-";
        let parentId = null;
        let isPayer = false;

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
          isPayer = parent.is_payer || false;
        } else if (s.parent_id) {
          parentName = `Parent #${s.parent_id}`;
          parentId = s.parent_id;
        }

        const parentSummary = parentId
          ? {
              id: parentId,
              name: parentName,
              email: parentEmail,
              is_payer: isPayer,
            }
          : null;

        const status = fb(user.status || s.status || "active");
        const createdAt = user.created_at || s.created_at || null;

        return {
          id: s.id,
          name,
          email,
          grade,
          subjectsText,
          parent_name: parentName,
          parent_email: parentEmail,
          parent_id: parentId,
          parentSummary,
          school,
          state,
          status,
          createdAt,
          // Include portal credentials from backend
          username: user.username || s.username,
          plain_pass: user.plain_pass || s.plain_pass,
          raw: {
            ...s,
            subjects: subjectsArray, // normalized for tabs
            user,
            parent: parentSummary
              ? {
                  ...parent,
                  user: parentUser,
                }
              : null,
          },
        };
      },
    },

    // Freeze the initial entity so routing/tab changes don't bounce the UI
    initialEntity: prefillRef.current || undefined,

    infoFields: [
      { label: "Name", name: "name" },
      { label: "Grade", name: "grade" },
      { label: "School", name: "school" },
      { label: "State", name: "state" },
      { label: "Status", name: "status" },
      { label: "Date added", name: "createdAt" },
    ],

    topInfo: (e) => {
      const chips = [];
      if (!e) return chips;
      if (e.grade && e.grade !== "-") chips.push(<Tag key="grade">{e.grade}</Tag>);
      if (e.state && e.state !== "-") chips.push(<Tag key="state">{e.state}</Tag>);
      return chips;
    },

    tabs: {
      // Subjects tab
      subjects: {
        enabled: true,
        label: "Subjects",
        render: (student, { reload } = {}) => {
          const studentId = student?.id;
          const subjects = Array.isArray(student?.raw?.subjects) ? student.raw.subjects : [];
          const assignedIds = new Set(
            subjects
              .map((s) => s?.id ?? s?.subject_id)
              .filter((v) => v !== undefined && v !== null)
          );

          const selectableOptions = availableSubjects
            .filter((subj) => {
              const id = subj?.id ?? subj?.subject_id;
              return id !== undefined && !assignedIds.has(id);
            })
            .map((subj) => ({
              label: subj?.name || subj?.subject_name || `Subject #${subj?.id ?? subj?.subject_id}`,
              value: subj?.id ?? subj?.subject_id,
            }));

          const onConfirmRemove = async (subject) => {
            const subjectId = subject?.id ?? subject?.subject_id;
            Modal.confirm({
              title: "Remove Subject",
              content: `Are you sure you want to remove ${
                subject?.subject_name || subject?.name || `Subject #${subjectId}`
              } from this student?`,
              okButtonProps: { danger: true },
              onOk: async () => {
                await handleRemoveSubject(studentId, subjectId);
                if (reload) await reload();
              },
            });
          };

          return (
            <>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Enrolled Subjects</h3>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAssignSubjectModalVisible(true)}
                  >
                    Assign Subject
                  </Button>
                </div>

                {subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject, idx) => {
                      const subjectId = subject?.id ?? subject?.subject_id ?? idx;
                      const subjectName =
                        subject?.subject_name || subject?.name || `Subject ${idx + 1}`;
                      return (
                        <Tag
                          key={subjectId}
                          color="blue"
                          className="text-sm py-1 px-3 flex items-center gap-2"
                          closable
                          onClose={(e) => {
                            e.preventDefault();
                            onConfirmRemove(subject);
                          }}
                        >
                          {subjectName}
                        </Tag>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500">No subjects assigned to this student</div>
                )}
              </div>

              {/* Assign Subject Modal */}
              <Modal
                key={`assign-subject-modal-${studentId}`}
                title="Assign Subject"
                open={assignSubjectModalVisible}
                onCancel={() => {
                  setAssignSubjectModalVisible(false);
                  setSelectedSubjectId(null);
                }}
                onOk={async () => {
                  await handleAssignSubject(studentId);
                  if (reload) await reload();
                }}
                confirmLoading={assigning}
                okText="Assign"
                okButtonProps={{ disabled: !selectedSubjectId }}
                destroyOnHidden
                maskClosable={false}
              >
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select a subject to assign"
                  value={selectedSubjectId}
                  onChange={setSelectedSubjectId}
                  options={selectableOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Modal>
            </>
          );
        },
      },

      // Parents/Guardians tab
      related: {
        enabled: true,
        label: "Parents / Guardians",
        showAddButton: false,
        idField: "id",
        refetchPath: (studentId) => `/student/${studentId}?include=parent`,
        extractList: (student) => {
          if (!student?.parent) return [];
          const parentUser = student.parent.user || {};
          return [
            {
              id: student.parent.id,
              name:
                [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ") ||
                `Parent #${student.parent.id}`,
              email: parentUser.email || "-",
              is_payer: student.parent.is_payer || false,
              phone: parentUser.phone || "-",
              status: parentUser.status || "active",
            },
          ];
        },
        columns: [
          { title: "ID", dataIndex: "id", key: "id", width: 80, render: (v) => v ?? "-" },
          { title: "Name", dataIndex: "name", key: "name", render: (v) => v || "-" },
          {
            title: "Contact",
            key: "contact",
            render: (_, record) => (
              <div>
                <div className="text-sm">{record.email || "No email"}</div>
                {record.phone && record.phone !== "-" && (
                  <div className="text-xs text-gray-500">{record.phone}</div>
                )}
              </div>
            ),
          },
          {
            title: "Role",
            dataIndex: "is_payer",
            key: "role",
            width: 120,
            render: (isPayer) => (
              <Tag color={isPayer ? "green" : "blue"}>{isPayer ? "Payer" : "Guardian"}</Tag>
            ),
          },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => (
              <Tag color={status === "active" ? "green" : "red"} className="capitalize">
                {status || "inactive"}
              </Tag>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            render: (_, record) => (
              <Button type="link" href={`/admin/parents/${record.id}`}>
                View
              </Button>
            ),
          },
        ],
        empty: "No parent linked to this student.",
      },

      // Activity
      activity: {
        enabled: true,
        label: "Activity",
        listPath: (id) => `/student/${id}/activity`,
        toolbar: () => (
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => message.info("Use the Reload button to refresh the activity list.")}
          >
            Refresh
          </Button>
        ),
        columns: [
          { title: "When", dataIndex: "timestamp", key: "timestamp", width: 200, render: (v) => v ?? "-" },
          { title: "Type", dataIndex: "homework_type", key: "homework_type", width: 160, render: (v) => v ?? "-" },
          { title: "Scan Info", dataIndex: "scan_info", key: "scan_info", render: (v) => v ?? "-" },
        ],
        empty: "No recent activity.",
      },

      audit: { enabled: false, label: "Audit Log" },
      tasks: { enabled: true, label: "Tasks" },
      documents: { enabled: true, label: "Documents" },
      communication: {
        enabled: false,
        label: "Comments",
        listPath: (id) => `/student/${id}/comments`,
        createPath: (id) => `/student/${id}/comments`,
      },

      // Billing snapshot (optional)
      billing: {
        enabled: false,
        rows: (e) => {
          const sub = e?.subscription || {};
          return [
            { label: "Billing Type", value: e?.billing_type },
            { label: "Billing Email", value: e?.billing_email },
            { label: "Plan Name", value: sub?.name },
            { label: "Plan Interval", value: sub?.interval },
            { label: "Plan Price", value: sub?.priceCents != null ? euro(sub.priceCents) : "-" },
            { label: "Renews On", value: sub?.renewsOn },
            { label: "Subscription Status", value: sub?.status || "-" },
            { label: "Account Balance", value: e?.accountBalanceCents != null ? euro(e.accountBalanceCents) : "-" },
          ];
        },
      },
    },
  }), [availableSubjects, handleAssignSubject, handleRemoveSubject, assignSubjectModalVisible, selectedSubjectId, assigning]);

  return <EntityDetail cfg={cfg} />;
}
