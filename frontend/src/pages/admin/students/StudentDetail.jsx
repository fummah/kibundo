// src/pages/students/StudentDetail.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Button, Tag, Modal, Select, App, Input, Space, Switch, Table, Image } from "antd";
import { PlusOutlined, UnorderedListOutlined, KeyOutlined, EditOutlined, SaveOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import EditCredentialsModal from "@/components/common/EditCredentialsModal";

const BUDDIES = [
  { id: "m1", name: "Milo", img: "/src/assets/buddies/kibundo-buddy.png" },
  { id: "m2", name: "Lumi", img: "/src/assets/buddies/kibundo-buddy1.png" },
  { id: "m3", name: "Zuzu", img: "/src/assets/buddies/monster1.png" },
  { id: "m4", name: "Kiko", img: "/src/assets/buddies/monster2.png" },
  { id: "m5", name: "Pipa", img: "/src/assets/buddies/Hausaufgaben.png" },
  { id: "m6", name: "Nori", img: "/src/assets/buddies/Lernen.png" },
];

const THEME_OPTIONS = [
  { label: "Indigo", value: "indigo" },
  { label: "Sky", value: "sky" },
  { label: "Emerald", value: "emerald" },
  { label: "Purple", value: "purple" },
  { label: "Rose", value: "rose" },
  { label: "Amber", value: "amber" },
];

const euro = (cents) => {
  const n = Number(cents);
  if (Number.isNaN(n)) return "-";
  return `${(n / 100).toFixed(2)} €`;
};

// Subjects Tab Component
const SubjectsTab = ({ student, reload }) => {
  const { modal } = App.useApp();
  const [assignSubjectModalVisible, setAssignSubjectModalVisible] = useState(false);
  const [selectedSubjectToAssign, setSelectedSubjectToAssign] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  
  const studentId = student?.id;
  const subjects = Array.isArray(student?.raw?.subjects) ? student.raw.subjects : [];
  const assignedIds = new Set(
    subjects
      .map((s) => s?.id ?? s?.subject_id)
      .filter(Boolean)
  );
  const notAssigned = allSubjects.filter((subj) => !assignedIds.has(subj.id));
  
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await api.get("/allsubjects");
        setAllSubjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading subjects:", err);
      }
    };
    fetchSubjects();
  }, []);

  const handleAssignSubject = async () => {
    if (!studentId || !selectedSubjectToAssign) return;
    try {
      await api.post(`/student/${studentId}/subject/${selectedSubjectToAssign}`);
      setAssignSubjectModalVisible(false);
      setSelectedSubjectToAssign(null);
      reload?.();
    } catch (err) {
      console.error("Error assigning subject:", err);
    }
  };
  
  const handleRemoveSubject = async (studentId, subjectId, reload) => {
    try {
      await api.delete(`/student/${studentId}/subject/${subjectId}`);
      reload?.();
    } catch (err) {
      console.error("Error removing subject:", err);
    }
  };
  
  const onConfirmRemove = (subject) => {
    const subjectId = subject?.id ?? subject?.subject_id;
    const subjectName = subject?.subject_name || subject?.name || "this subject";
    modal.confirm({
      title: "Remove Subject",
      content: `Are you sure you want to remove ${subjectName}?`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        await handleRemoveSubject(studentId, subjectId, reload);
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
        title="Assign Subject"
        open={assignSubjectModalVisible}
        onOk={handleAssignSubject}
        onCancel={() => {
          setAssignSubjectModalVisible(false);
          setSelectedSubjectToAssign(null);
        }}
        okButtonProps={{ disabled: !selectedSubjectToAssign }}
      >
        <Select
          placeholder="Select a subject"
          style={{ width: "100%" }}
          value={selectedSubjectToAssign}
          onChange={setSelectedSubjectToAssign}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          options={notAssigned.map((s) => ({
            label: s.subject_name || s.name || `Subject ${s.id}`,
            value: s.id,
          }))}
        />
      </Modal>
    </>
  );
};

// Interests Tab Component
const InterestsTab = ({ student, reload }) => {
  const { message } = App.useApp();
  const studentData = student?.raw || {};
  const interests = Array.isArray(studentData?.interests) ? studentData.interests : [];
  const profile = studentData?.profile || {};
  const buddy = studentData?.buddy || {};
  
  const [editingInterests, setEditingInterests] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState([]);
  const [newInterestInput, setNewInterestInput] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);
  
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ 
    name: studentData?.firstName || "",
    theme: profile?.theme || "indigo", 
    tts: profile?.tts ?? true 
  });
  const [buddyDraft, setBuddyDraft] = useState(buddy);
  const [savingProfile, setSavingProfile] = useState(false);
  
  const startEditingInterests = () => {
    setInterestsDraft([...interests]);
    setEditingInterests(true);
  };
  
  const cancelEditingInterests = () => {
    setInterestsDraft([]);
    setNewInterestInput("");
    setEditingInterests(false);
  };
  
  const addInterestToDraft = () => {
    if (newInterestInput.trim()) {
      setInterestsDraft([...interestsDraft, newInterestInput.trim()]);
      setNewInterestInput("");
    }
  };
  
  const removeInterestFromDraft = (index) => {
    setInterestsDraft(interestsDraft.filter((_, i) => i !== index));
  };
  
  const saveInterests = async () => {
    setSavingInterests(true);
    try {
      await api.patch(`/student/${student.id}`, {
        interests: interestsDraft,
      });
      message.success("Interests updated successfully!");
      setEditingInterests(false);
      reload?.();
    } catch (err) {
      console.error("Error saving interests:", err);
      message.error("Failed to save interests");
    } finally {
      setSavingInterests(false);
    }
  };
  
  const startEditingProfile = () => {
    setProfileDraft({ 
      name: studentData?.firstName || profile?.name || "",
      theme: profile?.theme || "indigo", 
      tts: profile?.tts ?? true 
    });
    setBuddyDraft(buddy);
    setEditingProfile(true);
  };
  
  const cancelEditingProfile = () => {
    setEditingProfile(false);
  };
  
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch(`/student/${student.id}`, {
        profile: profileDraft,
        buddy: buddyDraft,
      });
      message.success("Learning profile updated successfully!");
      setEditingProfile(false);
      reload?.();
    } catch (err) {
      console.error("Error saving profile:", err);
      message.error("Failed to save learning profile");
    } finally {
      setSavingProfile(false);
    }
  };
  
  return (
    <div className="p-4 space-y-6">
      {/* Interests Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Student Interests</h3>
          {!editingInterests ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={startEditingInterests}
            >
              Edit Interests
            </Button>
          ) : (
            <Space>
              <Button
                icon={<CloseOutlined />}
                onClick={cancelEditingInterests}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveInterests}
                loading={savingInterests}
              >
                Save
              </Button>
            </Space>
          )}
        </div>

        {editingInterests ? (
          <div className="space-y-3">
            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="Add new interest"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                onPressEnter={addInterestToDraft}
              />
              <Button type="primary" onClick={addInterestToDraft}>
                Add
              </Button>
            </Space.Compact>
            <div className="flex flex-wrap gap-2">
              {interestsDraft.map((interest, idx) => (
                <Tag
                  key={idx}
                  color="blue"
                  closable
                  onClose={() => removeInterestFromDraft(idx)}
                  className="text-sm py-1 px-3"
                >
                  {interest}
                </Tag>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((interest, idx) => (
                <Tag key={idx} color="blue" className="text-sm py-1 px-3">
                  {interest}
                </Tag>
              ))
            ) : (
              <div className="text-gray-500">No interests recorded</div>
            )}
          </div>
        )}
      </div>

      {/* Learning Profile Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Learning Profile</h3>
          {!editingProfile ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={startEditingProfile}
            >
              Edit Profile
            </Button>
          ) : (
            <Space>
              <Button
                icon={<CloseOutlined />}
                onClick={cancelEditingProfile}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveProfile}
                loading={savingProfile}
              >
                Save
              </Button>
            </Space>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
            {editingProfile ? (
              <Input
                value={profileDraft.name}
                onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                placeholder="Enter display name"
              />
            ) : (
              <Input
                value={studentData?.firstName || profile?.name || ""}
                disabled
                className="bg-gray-50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            {editingProfile ? (
              <Select
                value={profileDraft.theme}
                onChange={(val) => setProfileDraft({ ...profileDraft, theme: val })}
                style={{ width: "100%" }}
                options={THEME_OPTIONS}
              />
            ) : (
              <Input value={profile?.theme || "indigo"} disabled className="bg-gray-50" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Text-to-Speech</label>
            {editingProfile ? (
              <Switch
                checked={profileDraft.tts}
                onChange={(checked) => setProfileDraft({ ...profileDraft, tts: checked })}
              />
            ) : (
              <Tag color={profile?.tts ? "green" : "red"}>
                {profile?.tts ? "Enabled" : "Disabled"}
              </Tag>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Learning Buddy</label>
            {editingProfile ? (
              <Select
                value={buddyDraft?.id}
                onChange={(val) => {
                  const selected = BUDDIES.find((b) => b.id === val);
                  setBuddyDraft(selected);
                }}
                style={{ width: "100%" }}
                options={BUDDIES.map((b) => ({ label: b.name, value: b.id }))}
              />
            ) : (
              <Input value={buddy?.name || "Not set"} disabled className="bg-gray-50" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// API Usage Tab Component
const ApiUsageTab = ({ student }) => {
  const { message } = App.useApp();
  const [apiStats, setApiStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!student?.id) return;

    const loadApiStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/student/api-usage', {
          params: { student_id: student.id },
        });
        console.log("✅ API usage data received:", data);
        
        // Check if migration is needed
        if (data.requiresMigration || data.needsMigration) {
          console.warn("⚠️ API usage columns not found - migration needed");
          setError("migration");
          setApiStats(data);
        } else {
          setApiStats(data);
        }
      } catch (err) {
        console.error("❌ Failed to load API usage:", err);
        console.error("❌ Error response:", err.response?.data);
        
        if (err.response?.data?.requiresMigration) {
          setError("migration");
        } else {
          message.error(`Failed to load API usage data: ${err.response?.data?.message || err.message}`);
          setError("error");
        }
      } finally {
        setLoading(false);
      }
    };

    loadApiStats();
  }, [student?.id, message]);
  
  if (loading) {
    return <div className="p-4 text-center">Loading API usage data...</div>;
  }
  
  if (error === "migration") {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-yellow-800 font-medium mb-2">⚠️ Migration Required</h4>
          <p className="text-yellow-700 text-sm">
            The API usage tracking columns need to be added to the database.
            Please run the migration script:
            <code className="block mt-2 bg-yellow-100 p-2 rounded">
              backend1/scripts/add-api-usage-columns.sql
            </code>
          </p>
        </div>
      </div>
    );
  }
  
  if (error === "error" || !apiStats) {
    return <div className="p-4 text-center text-red-500">Failed to load API usage data</div>;
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-medium mb-4">💰 API Usage Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Scans</div>
          <div className="text-2xl font-bold text-blue-600">{apiStats.totalScans || 0}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Tokens</div>
          <div className="text-2xl font-bold text-green-600">{apiStats.totalTokens?.toLocaleString() || 0}</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Cost</div>
          <div className="text-2xl font-bold text-purple-600">${apiStats.totalCost?.toFixed(4) || "0.0000"}</div>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Avg Cost/Scan</div>
          <div className="text-2xl font-bold text-amber-600">${apiStats.avgCostPerScan?.toFixed(4) || "0.0000"}</div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Costs (Last 7 Days)</h4>
        <div className="space-y-1">
          {apiStats.dailyCosts && apiStats.dailyCosts.length > 0 ? (
            apiStats.dailyCosts.map((day, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{day.date}</span>
                <span className="font-medium">${day.cost?.toFixed(4) || "0.0000"}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No daily data available</div>
          )}
        </div>
      </div>
      
      {apiStats.lastScanDate && (
        <div className="text-sm text-gray-600">
          Last scan: {new Date(apiStats.lastScanDate).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Homework Tab Component
const HomeworkTab = ({ student }) => {
  const { message } = App.useApp();
  const [homeworkData, setHomeworkData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  
  useEffect(() => {
    if (!student?.id) {
      console.warn("⚠️ No student ID found for homework tab");
      return;
    }
    
    const loadHomework = async () => {
      setLoading(true);
      try {
        console.log("📚 Loading homework for student ID:", student.id);
        const { data } = await api.get(`/student/${student.id}/homeworkscans`);
        console.log("📚 Homework data received:", data?.length || 0, "submissions");
        setHomeworkData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Failed to load homework:", err);
        message.error("Failed to load homework submissions");
      } finally {
        setLoading(false);
      }
    };
    
    loadHomework();
  }, [student?.id, message]);
  
  const handlePreview = (fileUrl) => {
    setPreviewImage(fileUrl);
    setPreviewVisible(true);
  };
  
  const columns = [
    { 
      title: "ID", 
      dataIndex: "id", 
      key: "id", 
      width: 70,
      render: (v) => v || "-"
    },
    { 
      title: "Date Submitted", 
      dataIndex: "created_at", 
      key: "created_at", 
      width: 180,
      render: (v) => v ? new Date(v).toLocaleString() : "-"
    },
    { 
      title: "Subject", 
      dataIndex: "detected_subject", 
      key: "detected_subject", 
      width: 120,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <Tag>Not detected</Tag>
    },
    { 
      title: "Student Grade", 
      dataIndex: "grade", 
      key: "grade", 
      width: 120,
      render: (v, record) => {
        // Show grade from scan if available, otherwise show student's grade
        const displayGrade = v || student?.grade || student?.user?.grade;
        return displayGrade ? <Tag color="green">Grade {displayGrade}</Tag> : <Tag>Not set</Tag>;
      }
    },
    { 
      title: "Publisher", 
      dataIndex: "publisher", 
      key: "publisher", 
      width: 120,
      render: (v) => v || "-"
    },
    { 
      title: "Text Preview", 
      dataIndex: "raw_text", 
      key: "raw_text",
      width: 250,
      render: (v) => {
        if (!v) return <span className="text-gray-400">No text extracted</span>;
        const preview = v.substring(0, 80);
        return <span className="text-sm">{preview}{v.length > 80 ? "..." : ""}</span>;
      }
    },
    { 
      title: "File", 
      dataIndex: "file_url", 
      key: "file_url",
      width: 100,
      render: (v) => {
        if (!v) return "-";
        
        // Check if it's a base64 string or a URL
        const isBase64 = v.startsWith("data:") || !v.startsWith("http");
        const imageUrl = isBase64 ? v : v.startsWith("/") ? `http://localhost:3001${v}` : v;
        
        return (
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handlePreview(imageUrl)}
          >
            View
          </Button>
        );
      }
    },
  ];
  
  return (
    <div className="p-4">
      <Table
        columns={columns}
        dataSource={homeworkData}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
        locale={{
          emptyText: "No homework submissions yet."
        }}
      />
      
      <Modal
        open={previewVisible}
        title="Homework File Preview"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <div className="flex justify-center items-center">
          <Image
            src={previewImage}
            alt="Homework preview"
            style={{ maxWidth: "100%" }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        </div>
      </Modal>
    </div>
  );
};

export default function StudentDetail() {
  // Read location once, but freeze the prefill so later URL/tab changes don't trigger work
  const location = useLocation();
  const prefillRef = useRef(location.state?.prefill || null);

  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [currentEntity, setCurrentEntity] = useState(null);

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
      updatePath: (id) => `/students/${id}`,
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

        const firstName = fb(user.first_name);
        const lastName = fb(user.last_name);
        const name = fb([user.first_name, user.last_name].filter(Boolean).join(" "));
        const email = fb(user.email);
        const grade = fb(s.grade || s.class?.class_name || s.class_name);
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

        const status = fb(user.status || s.status || "Active");
        const createdAt = user.created_at || s.created_at || null;
        
        // Extract class_id from student or class relationship
        const class_id = s.class_id || s.class?.id || null;

        return {
          id: s.id,
          firstName,
          lastName,
          name,
          email,
          grade,
          class_id, // Add class_id for backend updates
          subjectsText,
          parent_name: parentName,
          parent_email: parentEmail,
          parent_id: parentId,
          parentSummary,
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
      { label: "First Name", name: "firstName" },
      { label: "Last Name", name: "lastName" },
      { label: "Grade", name: "grade" },
      { label: "State", name: "state" },
      { label: "Status", name: "status" },
      { label: "Portal Login", name: "username", editable: true },
      { label: "Portal Password", name: "plain_pass", editable: true, type: "password" },
      { label: "Date added", name: "createdAt", editable: false },
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
        render: (student, { reload } = {}) => <SubjectsTab student={student} reload={reload} />,
      },

      // Homework tab
      homework: {
        enabled: true,
        label: "Homework",
        render: (student) => <HomeworkTab student={student} />,
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
            render: (status) => {
              const statusLower = status?.toLowerCase();
              const color = statusLower === "active" ? "green" : statusLower === "suspended" ? "red" : "default";
              return (
                <Tag color={color} className="capitalize">
                  {status || "inactive"}
                </Tag>
              );
            },
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

      // Interests
      interests: {
        enabled: true,
        label: "Interests",
        render: (student, { reload } = {}) => <InterestsTab student={student} reload={reload} />,
      },

      // API Usage Statistics Tab
      apiUsage: {
        enabled: true,
        label: "API Usage",
        render: (student) => <ApiUsageTab student={student} />,
      },

      audit: { enabled: false, label: "Audit Log" },
      documents: { enabled: false, label: "Documents" },
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
  }), []);

  return (
    <App>
      <EntityDetail 
        cfg={cfg}
        onEntityLoad={(entity) => setCurrentEntity(entity)}
        extraHeaderButtons={(entity) => (
          <Button
            type="default"
            icon={<KeyOutlined />}
            onClick={() => setCredentialsModalVisible(true)}
            disabled={!entity?.raw?.user?.id}
          >
            Edit Login Credentials
          </Button>
        )}
      />
      
      {/* Edit Credentials Modal */}
      <EditCredentialsModal
        visible={credentialsModalVisible}
        onCancel={() => setCredentialsModalVisible(false)}
        userId={currentEntity?.raw?.user?.id}
        userName={currentEntity?.name || 'Student'}
        onSuccess={() => {
          message.success('Credentials updated successfully');
          // Optionally reload the entity
        }}
      />
    </App>
  );
}

