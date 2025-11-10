// src/pages/students/StudentDetail.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import EntityDetail from "@/components/EntityDetail.jsx";
import { Button, Tag, Modal, Select, App, Input, Space, Switch, Table, Image } from "antd";
import { PlusOutlined, UnorderedListOutlined, KeyOutlined, EditOutlined, SaveOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import api from "@/api/axios";
import EditCredentialsModal from "@/components/common/EditCredentialsModal";

// Import buddy images
import buddyMilo from "@/assets/buddies/kibundo-buddy.png";
import buddyLumi from "@/assets/buddies/kibundo-buddy1.png";
import buddyZuzu from "@/assets/buddies/monster1.png";
import buddyKiko from "@/assets/buddies/monster21.png";
import buddyPipa from "@/assets/buddies/Hausaufgaben.png";
import buddyNori from "@/assets/buddies/Lernen.png";

const BUDDIES = [
  { id: "m1", name: "Milo", img: buddyMilo },
  { id: "m2", name: "Lumi", img: buddyLumi },
  { id: "m3", name: "Zuzu", img: buddyZuzu },
  { id: "m4", name: "Kiko", img: buddyKiko },
  { id: "m5", name: "Pipa", img: buddyPipa },
  { id: "m6", name: "Nori", img: buddyNori },
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
  // Debug: Log what we're getting
  console.log('📚 [SubjectsTab] Student data:', {
    studentId,
    hasRaw: !!student?.raw,
    rawSubjects: student?.raw?.subjects,
    rawSubject: student?.raw?.subject,
    directSubjects: student?.subjects,
    directSubject: student?.subject,
  });
  
  // Try multiple paths to find subjects
  const subjects = Array.isArray(student?.raw?.subjects) 
    ? student.raw.subjects 
    : Array.isArray(student?.raw?.subject)
    ? student.raw.subject
    : Array.isArray(student?.subjects)
    ? student.subjects
    : Array.isArray(student?.subject)
    ? student.subject
    : [];
  const assignedIds = new Set(
    subjects
      .map((s) => {
        // Try multiple possible ID fields
        return s?.id ?? s?.subject_id ?? s?.subject?.id ?? null;
      })
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
              const subjectId = subject?.id ?? subject?.subject_id ?? subject?.subject?.id ?? idx;
              const subjectName =
                subject?.subject_name || subject?.name || subject?.subject?.subject_name || `Subject ${idx + 1}`;
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
const InterestsTab = ({ student, reload, onProfileSave }) => {
  const { message } = App.useApp();
  const studentData = student?.raw || {};
  const interests = Array.isArray(studentData?.interests) ? studentData.interests : [];
  const profile = studentData?.profile || {};
  // Handle buddy: use null if empty object or falsy, otherwise use the buddy object
  const buddy = studentData?.buddy && Object.keys(studentData.buddy).length > 0 ? studentData.buddy : null;
  
  // Get student's actual name (prioritize user's name over profile name, ignore test values)
  const getUserName = () => {
    const user = studentData?.user || {};
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    
    // Only use profile name if it's not a test value
    const profileName = profile?.name || studentData?.firstName || "";
    const isTestName = profileName?.toLowerCase().includes("test");
    if (profileName && !isTestName) return profileName;
    
    // Fallback to computed name from student object
    if (student?.name && !student.name.toLowerCase().includes("test")) return student.name;
    
    return null;
  };
  
  const studentName = getUserName();
  
  const [editingInterests, setEditingInterests] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState([]);
  const [newInterestInput, setNewInterestInput] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);
  
  const [profileDraft, setProfileDraft] = useState({ 
    name: profile?.name || "",
    theme: profile?.theme || "indigo", 
    ttsEnabled: profile?.ttsEnabled !== undefined ? Boolean(profile.ttsEnabled) : (profile?.tts !== undefined ? Boolean(profile.tts) : true)
  });
  const [buddyDraft, setBuddyDraft] = useState(buddy);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Expose save function to parent component (no messages - parent will show them)
  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    try {
      // Validate buddy data - ensure it has required fields if it exists
      let buddyToSave = null;
      if (buddyDraft && buddyDraft.id && buddyDraft.name) {
        // Find the full buddy object from BUDDIES array to ensure we have the img
        const fullBuddy = BUDDIES.find(b => b.id === buddyDraft.id) || buddyDraft;
        buddyToSave = {
          id: fullBuddy.id,
          name: fullBuddy.name,
          img: fullBuddy.img || buddyDraft.img || buddyMilo
        };
      }
      
      await api.patch(`/student/${student.id}`, {
        profile: {
          name: profileDraft.name || "",
          theme: profileDraft.theme || "indigo",
          ttsEnabled: Boolean(profileDraft.ttsEnabled),
        },
        buddy: buddyToSave,
      });
      reload?.();
      return true;
    } catch (err) {
      console.error("Error saving profile:", err);
      message.error(err?.response?.data?.message || "Failed to save profile. Please try again.");
      return false;
    } finally {
      setSavingProfile(false);
    }
  }, [student.id, profileDraft.name, profileDraft.theme, profileDraft.ttsEnabled, buddyDraft, reload, message]);
  
  // Expose save function to parent via callback
  useEffect(() => {
    if (onProfileSave) {
      onProfileSave(saveProfile);
    }
  }, [saveProfile, onProfileSave]);
  
  // Update profileDraft when student data loads
  useEffect(() => {
    setProfileDraft(prev => ({
      ...prev,
      name: profile?.name || "",
      theme: profile?.theme || "indigo",
      ttsEnabled: profile?.ttsEnabled !== undefined ? Boolean(profile.ttsEnabled) : (profile?.tts !== undefined ? Boolean(profile.tts) : true)
    }));
    
    // Handle buddy initialization - ensure it has all required fields or set to null
    if (buddy && buddy.id && buddy.name) {
      // Find the full buddy object from BUDDIES array to ensure we have the img
      const fullBuddy = BUDDIES.find(b => b.id === buddy.id);
      if (fullBuddy) {
        setBuddyDraft(fullBuddy);
      } else if (buddy.img) {
        // If buddy exists but not in BUDDIES array, use it as-is if it has img
        setBuddyDraft(buddy);
      } else {
        setBuddyDraft(null);
      }
    } else {
      setBuddyDraft(null);
    }
  }, [profile?.name, profile?.theme, profile?.ttsEnabled, buddy]);
  
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
  
  return (
    <div className="p-4 space-y-6">
      {/* Interests Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {studentName ? `${studentName}'s Interests` : "Student Interests"}
          </h3>
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
              <div className="text-gray-500">
                {studentName 
                  ? `${studentName} hasn't added any interests yet`
                  : "No interests recorded"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learning Profile Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Learning Profile</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Customize the student's learning experience preferences. The display name is what the student sees in their app.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
            <Input
              value={profileDraft.name}
              onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
              placeholder="Enter display name (what student sees in app)"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the name the student selected. You can edit it here.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <Select
              value={profileDraft.theme}
              onChange={(val) => setProfileDraft({ ...profileDraft, theme: val })}
              style={{ width: "100%" }}
              options={THEME_OPTIONS}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Text-to-Speech</label>
              <span className="text-xs text-gray-500">Enable voice feedback from the learning buddy</span>
            </div>
            <Switch
              checked={profileDraft.ttsEnabled}
              onChange={(checked) => setProfileDraft({ ...profileDraft, ttsEnabled: checked })}
              size="default"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Learning Buddy</label>
            {buddyDraft && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <img
                    src={buddyDraft.img || buddyMilo}
                    alt={buddyDraft.name || "Learning Buddy"}
                    className="w-12 h-12 object-contain rounded-lg"
                    onError={(e) => {
                      e.target.src = buddyMilo;
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Current: {buddyDraft.name || "Not selected"}
                    </p>
                    <p className="text-xs text-gray-500">
                      This is the buddy the student selected. You can change it below.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Select
              value={buddyDraft?.id}
              onChange={(val) => {
                if (val) {
                  const selected = BUDDIES.find((b) => b.id === val);
                  if (selected) {
                    setBuddyDraft(selected);
                  } else {
                    setBuddyDraft(null);
                  }
                } else {
                  setBuddyDraft(null);
                }
              }}
              allowClear
              style={{ width: "100%" }}
              options={BUDDIES.map((b) => ({ label: b.name, value: b.id }))}
              placeholder="Select a learning buddy"
            />
            {!buddyDraft && (
              <p className="text-xs text-gray-500 mt-1">
                No learning buddy selected by the student yet.
              </p>
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
        
        // Check if migration is needed
        if (data.requiresMigration || data.needsMigration) {
          console.warn("⚠️ API usage columns not found - migration needed");
          setError("migration");
          setApiStats(data);
        } else {
          // Transform backend response to match frontend expectations
          const transformed = {
            // Overview stats
            totalScans: data.overview?.total_scans || 0,
            totalTokens: data.overview?.total_tokens || 0,
            totalCost: data.overview?.total_cost_usd || 0,
            avgCostPerScan: data.overview?.average_cost_per_scan || 0,
            avgTokensPerScan: data.overview?.average_tokens_per_scan || 0,
            
            // Period breakdowns
            last7Days: {
              scans: data.periods?.last_7_days?.scans || 0,
              tokens: data.periods?.last_7_days?.tokens || 0,
              cost: data.periods?.last_7_days?.cost_usd || 0,
            },
            last30Days: {
              scans: data.periods?.last_30_days?.scans || 0,
              tokens: data.periods?.last_30_days?.tokens || 0,
              cost: data.periods?.last_30_days?.cost_usd || 0,
            },
            allTime: {
              scans: data.periods?.all_time?.scans || 0,
              tokens: data.periods?.all_time?.tokens || 0,
              cost: data.periods?.all_time?.cost_usd || 0,
            },
            
            // By subject
            bySubject: data.by_subject || [],
            
            // Recent scans
            recentScans: data.recent_scans || [],
            
            // Last scan date
            lastScanDate: data.recent_scans?.[0]?.date || null,
            
            // Daily costs (generate from recent_scans)
            dailyCosts: (() => {
              const recent = data.recent_scans || [];
              const dailyMap = {};
              recent.forEach(scan => {
                const date = new Date(scan.date).toLocaleDateString();
                if (!dailyMap[date]) {
                  dailyMap[date] = 0;
                }
                dailyMap[date] += scan.cost_usd || 0;
              });
              return Object.entries(dailyMap)
                .map(([date, cost]) => ({ date, cost }))
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 7);
            })(),
            
            // Raw data for reference
            raw: data,
          };
          
          setApiStats(transformed);
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
      
      {/* Overview Cards */}
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
          <div className="text-2xl font-bold text-purple-600">${(apiStats.totalCost || 0).toFixed(4)}</div>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Avg Cost/Scan</div>
          <div className="text-2xl font-bold text-amber-600">${(apiStats.avgCostPerScan || 0).toFixed(4)}</div>
        </div>
      </div>
      
      {/* Period Breakdown */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Usage by Period</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Last 7 Days</div>
            <div className="text-sm font-semibold">{apiStats.last7Days?.scans || 0} scans</div>
            <div className="text-xs text-gray-600">${(apiStats.last7Days?.cost || 0).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Last 30 Days</div>
            <div className="text-sm font-semibold">{apiStats.last30Days?.scans || 0} scans</div>
            <div className="text-xs text-gray-600">${(apiStats.last30Days?.cost || 0).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">All Time</div>
            <div className="text-sm font-semibold">{apiStats.allTime?.scans || 0} scans</div>
            <div className="text-xs text-gray-600">${(apiStats.allTime?.cost || 0).toFixed(4)}</div>
          </div>
        </div>
      </div>
      
      {/* Usage by Subject */}
      {apiStats.bySubject && apiStats.bySubject.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Usage by Subject</h4>
          <div className="space-y-2">
            {apiStats.bySubject.map((subject, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="font-medium">{subject.subject}</span>
                <div className="text-right">
                  <div>{subject.scan_count} scans</div>
                  <div className="text-xs text-gray-600">
                    ${(subject.cost_usd || 0).toFixed(4)} | {subject.tokens?.toLocaleString() || 0} tokens
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Daily Costs */}
      {apiStats.dailyCosts && apiStats.dailyCosts.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Costs (Last 7 Days)</h4>
          <div className="space-y-1">
            {apiStats.dailyCosts.map((day, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{day.date}</span>
                <span className="font-medium">${(day.cost || 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Scans */}
      {apiStats.recentScans && apiStats.recentScans.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Scans (Last 5)</h4>
          <div className="space-y-1">
            {apiStats.recentScans.slice(0, 5).map((scan, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{scan.subject || 'Unknown'}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(scan.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <div>${(scan.cost_usd || 0).toFixed(4)}</div>
                  <div className="text-xs text-gray-500">{scan.tokens?.toLocaleString() || 0} tokens</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
        const { data } = await api.get(`/student/${student.id}/homeworkscans`);
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
        const isBase64 = v.startsWith("data:");
        // If it's a relative path starting with /, use it as-is (will be resolved by the server)
        // If it's an absolute URL, use it as-is
        // If it's base64, use it as-is
        const imageUrl = isBase64 ? v : (v.startsWith("/") ? v : (v.startsWith("http") ? v : `/${v}`));
        
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
  const profileSaveRef = useRef(null);

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
        const age = s.age !== undefined && s.age !== null ? String(s.age) : "-";

        // Subjects: accept either array of subjects or array of links containing subject
        // Backend returns student_subjects as 'subject' array with nested subject data
        const rawSubjects = Array.isArray(s.subjects)
          ? s.subjects
          : Array.isArray(s.subject)
          ? s.subject
          : [];
        
        console.log('📚 [parseEntity] Raw subjects data:', {
          hasSubjects: Array.isArray(s.subjects) && s.subjects.length > 0,
          hasSubject: Array.isArray(s.subject) && s.subject.length > 0,
          subjectCount: rawSubjects.length,
          firstSubject: rawSubjects[0],
        });
        
        const subjectsArray = rawSubjects.map((it) => {
          // Handle student_subjects structure: { id, subject_id, subject: { id, subject_name } }
          if (it?.subject) {
            return {
              id: it.subject.id,
              subject_id: it.subject.id,
              subject_name: it.subject.subject_name,
              name: it.subject.subject_name,
              ...it.subject
            };
          }
          // If it's already a subject object
          if (it?.subject_name || it?.name) {
            return {
              id: it.id,
              subject_id: it.id,
              subject_name: it.subject_name || it.name,
              name: it.subject_name || it.name,
              ...it
            };
          }
          return it;
        }).filter(Boolean); // Remove any null/undefined entries

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

        // Build full parent object for tabs
        const fullParent = parent
          ? {
              ...parent,
              user: parentUser,
              ...(parentSummary ? { ...parentSummary } : {}),
            }
          : null;

        return {
          id: s.id,
          firstName,
          lastName,
          name,
          email,
          grade,
          age,
          class_id, // Add class_id for backend updates
          subjectsText,
          parent_name: parentName,
          parent_email: parentEmail,
          parent_id: parentId,
          parentSummary,
          // Add parent at top level for easy access in tabs
          parent: fullParent,
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
            // Preserve full parent structure for tabs that need it
            parent: fullParent,
          },
        };
      },
    },

    // Freeze the initial entity so routing/tab changes don't bounce the UI
    initialEntity: prefillRef.current || undefined,

    infoFields: [
      { label: "First Name", name: "firstName" },
      { label: "Last Name", name: "lastName" },
      { label: "Age", name: "age" },
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
        // Use prefetchRowsFromEntity to get data from parsed entity instead of refetching
        prefetchRowsFromEntity: (student) => {
          // Check both student.parent (top level) and student.raw.parent
          const parent = student?.parent || student?.raw?.parent;
          console.log('👨‍👩‍👧 [Parent Tab] Extracting parent from entity:', {
            hasStudent: !!student,
            hasParent: !!student?.parent,
            hasRawParent: !!student?.raw?.parent,
            parent: parent,
            parentUser: parent?.user,
          });
          
          if (!parent) return [];
          const parentUser = parent.user || {};
          return [
            {
              id: parent.id,
              name:
                [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ") ||
                `Parent #${parent.id}`,
              email: parentUser.email || "-",
              is_payer: parent.is_payer || false,
              phone: parentUser.contact_number || parentUser.phone || "-",
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
        render: (student, { reload } = {}) => (
          <InterestsTab 
            student={student} 
            reload={reload} 
            onProfileSave={(saveFn) => {
              profileSaveRef.current = saveFn;
            }}
          />
        ),
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
        onBeforeSave={async () => {
          // Save profile data when main Save button is clicked
          if (profileSaveRef.current) {
            return await profileSaveRef.current();
          }
          return true;
        }}
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

