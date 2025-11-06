import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
// ParentShell is now handled at route level
import BuddyAvatar from "@/components/student/BuddyAvatar";
import globalBg from "@/assets/backgrounds/global-bg.png";
import monster1 from "@/assets/buddies/monster1.png";
import monster2 from "@/assets/buddies/monster2.png";

import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Typography,
  Space,
  Empty,
  message,
  Spin,
} from "antd";
import {
  PlusOutlined,
  LeftOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AddStudentFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [params] = useSearchParams();

  // 0:intro, 1:list, 2:form, 3:success
  const urlStep = Number(params.get("step"));
  const initialStep = Number.isFinite(urlStep) ? Math.max(0, Math.min(3, urlStep)) : 0;
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [states, setStates] = useState([]);
  const [parentId, setParentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [checkingStudents, setCheckingStudents] = useState(true);
  const isInitialMountRef = React.useRef(true);

  // Fetch dropdown options (classes, subjects, states) when on step 2
  useEffect(() => {
    const fetchDropdowns = async () => {
      if (step === 2) {
        setLoadingDropdowns(true);
        try {
          const [classesRes, subjectsRes, statesRes] = await Promise.all([
            api.get("/allclasses"),
            api.get("/allsubjects"),
            api.get("/states")
          ]);
          
          const allClasses = Array.isArray(classesRes.data) 
            ? classesRes.data 
            : (classesRes.data?.data || []);
          setClasses(allClasses);
          
          const allSubjects = Array.isArray(subjectsRes.data) 
            ? subjectsRes.data 
            : (subjectsRes.data?.data || []);
          setSubjects(allSubjects);
          
          const allStates = Array.isArray(statesRes.data) 
            ? statesRes.data 
            : (statesRes.data?.data || []);
          setStates(allStates);
        } catch (error) {
          console.error("❌ Error fetching dropdown options:", error);
        } finally {
          setLoadingDropdowns(false);
        }
      }
    };
    
    fetchDropdowns();
  }, [step]);

  // Fetch parent ID and students on mount
  useEffect(() => {
    const fetchData = async () => {
      setCheckingStudents(true);
      setLoading(true);
      try {
        // Get current user to find parent_id
        const currentUserRes = await api.get("/current-user");
        const currentUser = currentUserRes.data;
        
        // Get parent_id from user's parent relationship
        let foundParentId = null;
        if (currentUser?.parent && Array.isArray(currentUser.parent) && currentUser.parent.length > 0) {
          foundParentId = currentUser.parent[0].id;
        } else if (currentUser?.parent?.id) {
          foundParentId = currentUser.parent.id;
        } else if (currentUser?.parent_id) {
          foundParentId = currentUser.parent_id;
        }
        
        setParentId(foundParentId);
        
        // Fetch all students and filter by parent_id
        if (foundParentId) {
          const studentsRes = await api.get("/allstudents");
          const allStudents = Array.isArray(studentsRes.data) 
            ? studentsRes.data 
            : (studentsRes.data?.data || []);
          
          // Filter students by parent_id
          const parentStudents = allStudents.filter(s => s.parent_id === foundParentId);
          setStudents(parentStudents);
          
          // Auto-skip to form if no students and on step 0 or 1
          // Do this after setting students, but defer navigation to avoid render warnings
          const currentUrlStep = params.get("step");
          if (parentStudents.length === 0 && currentUrlStep !== "2" && currentUrlStep !== "3") {
            const currentStepNum = Number(currentUrlStep);
            const isValidStep = Number.isFinite(currentStepNum) ? Math.max(0, Math.min(3, currentStepNum)) : 0;
            if (isValidStep === 0 || isValidStep === 1) {
              // Defer navigation to next tick to avoid render warnings
              setTimeout(() => {
                navigate("/parent/myfamily/add-student-flow?step=2", { replace: true });
              }, 0);
            }
          }
        }
        
        // Fetch classes for display
        const classesRes = await api.get("/allclasses");
        const allClasses = Array.isArray(classesRes.data) 
          ? classesRes.data 
          : (classesRes.data?.data || []);
        setClasses(allClasses);
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        message.error(t("parent.addStudent.fetchError", "Failed to load students."));
      } finally {
        setLoading(false);
        setCheckingStudents(false);
      }
    };
    
    fetchData();
  }, [t, navigate, params]); // Added navigate and params for auto-skip logic

  // Sync step with URL parameter (only after initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    const urlStepParam = params.get("step");
    const urlStepNum = Number(urlStepParam);
    if (Number.isFinite(urlStepNum)) {
      const validStep = Math.max(0, Math.min(3, urlStepNum));
      // Only update if different to avoid unnecessary re-renders
      setStep((currentStep) => {
        return currentStep !== validStep ? validStep : currentStep;
      });
    }
  }, [params]);


  const goBack = () => {
    setStep((s) => {
      const newStep = Math.max(0, s - 1);
      // If going back from step 2 and parent has no students, go to step 0 (intro) instead of step 1
      if (s === 2 && newStep === 1 && students.length === 0) {
        navigate("/parent/myfamily/add-student-flow?step=0", { replace: true });
        return 0;
      }
      navigate(`/parent/myfamily/add-student-flow?step=${newStep}`, { replace: true });
      return newStep;
    });
  };
  
  const goNext = () => {
    setStep((s) => {
      let newStep = Math.min(3, s + 1);
      // If going from step 0 to step 1, but parent has no students, skip to step 2
      if (s === 0 && newStep === 1 && students.length === 0) {
        newStep = 2;
      }
      navigate(`/parent/myfamily/add-student-flow?step=${newStep}`, { replace: true });
      return newStep;
    });
  };

  const onCreate = async (values) => {
    setSubmitting(true);
    try {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      // Get parent_id if not already set
      let finalParentId = parentId;
      if (!finalParentId) {
        const currentUserRes = await api.get("/current-user");
        const currentUser = currentUserRes.data;
        if (currentUser?.parent && Array.isArray(currentUser.parent) && currentUser.parent.length > 0) {
          finalParentId = currentUser.parent[0].id;
        } else if (currentUser?.parent?.id) {
          finalParentId = currentUser.parent.id;
        } else if (currentUser?.parent_id) {
          finalParentId = currentUser.parent_id;
        }
      }
      
      if (!finalParentId) {
        throw new Error("Parent ID not found. Please ensure you are logged in as a parent.");
      }
      
      // Generate temporary email for student (backend requires email)
      const tempEmail = `student_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@temp.kibundo.local`;
      
      // Create User account with role_id = 1 (Student)
      // The backend should automatically create a Student record when role_id=1
      const userBody = {
        role_id: 1, // Student role
        first_name: values.first_name,
        last_name: values.last_name || "",
        email: tempEmail,
        state: values.state || "",
        class_id: values.class_id,
        parent_id: finalParentId, // Set parent_id so student is linked to parent
        subjects: Array.isArray(values.subjects) ? values.subjects : [],
      };

      console.log("📤 Creating student user:", userBody);
      
      const userRes = await api.post("/adduser", userBody);
      const createdUser = userRes?.data?.user || userRes?.data;
      
      if (!createdUser?.id) {
        throw new Error("Failed to create user account");
      }

      console.log("✅ User created:", createdUser.id);

      // Wait a bit for backend to create student record, then update it
      // Fetch students to find the newly created one
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
      
      const studentRes = await api.get(`/allstudents`);
      const allStudents = Array.isArray(studentRes.data) 
        ? studentRes.data 
        : (studentRes.data?.data || []);
      const newStudent = allStudents.find(s => s.user_id === createdUser.id);
      
      if (newStudent) {
        // Update student with additional profile info (age and school)
        try {
          const updatePayload = {};
          if (values.age) {
            updatePayload.age = Number(values.age);
          }
          if (values.school) {
            updatePayload.school = values.school;
          }
          if (Object.keys(updatePayload).length > 0) {
            await api.put(`/students/${newStudent.id}`, updatePayload);
          }
        } catch (updateError) {
          console.warn("⚠️ Could not update student profile:", updateError);
          // Continue anyway - student was created successfully
        }
      }
      
      // Refresh students list
      const updatedStudentsRes = await api.get("/allstudents");
      const updatedAllStudents = Array.isArray(updatedStudentsRes.data) 
        ? updatedStudentsRes.data 
        : (updatedStudentsRes.data?.data || []);
      const updatedParentStudents = updatedAllStudents.filter(s => s.parent_id === finalParentId);
      setStudents(updatedParentStudents);
      
      message.success(t("parent.addStudent.toast.created", "Student created successfully!"));
      setStep(3);
    } catch (e) {
      console.error("❌ Error creating student:", e);
      message.error(
        t("parent.addStudent.toast.createFailed", "Could not create student.") + 
        (e?.response?.data?.message ? `: ${e.response.data.message}` : "")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking if parent has students
  if (checkingStudents && step !== 2 && step !== 3) {
    return (
      <div className="mx-auto w-full max-w-[820px] py-6 px-4">
        <Card className="rounded-2xl shadow-sm">
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        </Card>
      </div>
    );
  }

  return (
      <div className="mx-auto w-full max-w-[820px] py-6 px-4">
        {/* ---------- Step 0: Intro (with mascot) ---------- */}
        {step === 0 && (
          <Card 
            className="rounded-2xl shadow-sm"
            title={
              <Space>
                <Button 
                  type="text" 
                  icon={<LeftOutlined />} 
                  onClick={() => navigate("/parent/home")}
                />
                <span className="font-semibold">
                  {t("parent.addStudent.introTitle", "Create a student account")}
                </span>
              </Space>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="order-2 md:order-1">
                <Text className="text-neutral-600">
                  {t(
                    "parent.addStudent.introText",
                    "So your student can use the app independently and safely, create the student account now."
                  )}
                </Text>
                <div className="mt-6">
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      // Always go directly to form (step 2)
                      setStep(2);
                      navigate("/parent/myfamily/add-student-flow?step=2", { replace: true });
                    }}
                  >
                    {t("parent.addStudent.add", "Add Student")}
                  </Button>
                </div>
              </div>

              <div className="order-1 md:order-2 flex justify-center">
              <BuddyAvatar src={monster1} size={160} ring={false} />
              </div>
            </div>
          </Card>
        )}

        {/* ---------- Step 1: Current Students ---------- */}
        {step === 1 && (
          <Card
            className="rounded-2xl shadow-sm"
            title={
              <Space>
                <Button type="text" icon={<LeftOutlined />} onClick={goBack} />
                <span className="font-semibold">
                  {t("parent.addStudent.currentTitle", "Your Students")}
                </span>
              </Space>
            }
          >
            {loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : students.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.map((s) => {
                  const studentUser = s.user || {};
                  const firstName = studentUser.first_name || "";
                  const lastName = studentUser.last_name || "";
                  const fullName = `${firstName} ${lastName}`.trim() || `Student #${s.id}`;
                  // Map student ID to monster image (cycle through monster1, monster2)
                  const monsterImages = [monster1, monster2];
                  const defaultAvatar = monsterImages[(s.id - 1) % 2];
                  const avatar = studentUser.avatar || defaultAvatar;
                  
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"
                    >
                      <BuddyAvatar src={avatar} size={56} />
                      <div className="leading-tight">
                        <div className="font-semibold">{fullName}</div>
                        <Text type="secondary">
                          {s.status || (s.user?.status || "Active")}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description={t("parent.addStudent.noStudents", "No students yet.")} />
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setStep(2);
                navigate("/parent/myfamily/add-student-flow?step=2", { replace: true });
              }}>
                {t("parent.addStudent.addAnother", "Add another student")}
              </Button>
              <Button onClick={() => navigate("/parent/home")}>
                {t("common.cancel", "Cancel")}
              </Button>
            </div>
          </Card>
        )}

        {/* ---------- Step 2: Form ---------- */}
        {step === 2 && (
          <Card
            className="rounded-2xl shadow-sm"
            title={
              <Space>
                <Button 
                  type="text" 
                  icon={<LeftOutlined />} 
                  onClick={() => {
                    // If parent has students, go back to student list (step 1)
                    // Otherwise, go to home screen
                    if (students.length > 0) {
                      goBack();
                    } else {
                      navigate("/parent/home");
                    }
                  }}
                />
                <span className="font-semibold">
                  {t("parent.addStudent.formTitle", "Student Details")}
                </span>
              </Space>
            }
          >
            <Form
              key="add-student-step2" // remounts if you leave & return
              layout="vertical"
              requiredMark="optional"
              onFinish={onCreate}
            >
              <Form.Item
                label={t("parent.addStudent.firstName", "First name")}
                name="first_name"
                rules={[
                  { required: true, message: t("errors.required", "This field is required.") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
              >
                <Input placeholder={t("parent.addStudent.firstName_ph", "Enter first name")} />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.lastName", "Last name")}
                name="last_name"
                rules={[
                  { required: true, message: t("errors.required", "This field is required.") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
              >
                <Input placeholder={t("parent.addStudent.lastName_ph", "Enter last name")} />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.age", "Age")}
                name="age"
                rules={[
                  { required: true, message: t("errors.required", "This field is required.") },
                  {
                    validator: (_, v) => {
                      if (v === undefined || v === null || v === "") return Promise.reject(new Error(t("errors.required", "This field is required.")));
                      const n = Number(v);
                      return n >= 4 && n <= 18
                        ? Promise.resolve()
                        : Promise.reject(new Error(t("errors.ageRange", "Age must be between 4 and 18.")));
                    },
                  },
                ]}
              >
                <Input type="number" placeholder="8" min={4} max={18} />
              </Form.Item>

              <Form.Item
                label="Class"
                name="class_id"
                rules={[{ required: true, message: t("errors.required", "This field is required.") }]}
              >
                <Select
                  placeholder="Select class"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={classes.map((c) => ({
                    value: c.id,
                    label: c.class_name || `Class ${c.id}`,
                  }))}
                  loading={loadingDropdowns}
                />
              </Form.Item>

              <Form.Item
                label="Subjects"
                name="subjects"
                rules={[{ required: true, message: t("errors.required", "This field is required.") }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select subjects"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={subjects.map((s) => ({
                    value: s.id,
                    label: s.subject_name || s.name || `Subject ${s.id}`,
                  }))}
                  loading={loadingDropdowns}
                />
              </Form.Item>

              <Form.Item
                label="State"
                name="state"
                rules={[{ required: true, message: t("errors.required", "This field is required.") }]}
              >
                <Select
                  placeholder="Select state"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={states.map((s) => ({
                    value: s.state_name || s.name || String(s),
                    label: s.state_name || s.name || String(s),
                  }))}
                  loading={loadingDropdowns}
                />
              </Form.Item>

              <Form.Item
                label="School (Optional)"
                name="school"
              >
                <Input placeholder="Enter school name (optional)" />
              </Form.Item>

              <div className="flex items-center justify-end gap-2">
                <Button 
                  onClick={() => {
                    // If parent has students, go back to student list (step 1)
                    // Otherwise, go to home screen
                    if (students.length > 0) {
                      goBack();
                    } else {
                      navigate("/parent/home");
                    }
                  }}
                >
                  {t("common.back", "Back")}
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {t("parent.addStudent.create", "Create")}
                </Button>
              </div>
            </Form>
          </Card>
        )}

        {/* ---------- Step 3: Success ---------- */}
        {step === 3 && (
          <Card className="rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="order-2 md:order-1">
                <Title level={3} className="!mb-2">
                  <CheckCircleFilled className="text-emerald-500 mr-2" />
                  {t("parent.addStudent.successTitle", "All set!")}
                </Title>
                <Text className="text-neutral-600 block mb-6">
                  {t(
                    "parent.addStudent.successText",
                    "We’ll take you back to the home screen. Your student can log in independently from there."
                  )}
                </Text>
                <Space>
                  <Button type="primary" onClick={() => navigate("/parent/home")}>
                    {t("parent.addStudent.backHome", "Continue")}
                  </Button>
                  <Button onClick={() => {
                    setStep(2);
                    navigate("/parent/myfamily/add-student-flow?step=2", { replace: true });
                  }}>
                    {t("parent.addStudent.addAnother", "Add another student")}
                  </Button>
                </Space>
              </div>
              <div className="order-1 md:order-2 flex justify-center">
                <BuddyAvatar
                  src={monster1}
                  alt="Mascot"
                  size={160}
                  ring={false}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
  );
}
