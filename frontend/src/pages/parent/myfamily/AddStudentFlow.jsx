import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
// ParentShell is now handled at route level
import CircularBackground from "@/components/layouts/CircularBackground";

import {
  Button,
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
  DownOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const ONBOARDING_FLAG_KEY = "parent.onboarding.active";
const ONBOARDING_NEXT_KEY = "parent.onboarding.next";
const ONBOARDING_RETURN_KEY = "parent.onboarding.return";

export default function AddStudentFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [params] = useSearchParams();

  // 0:form, 1:success (simplified flow - removed intro and list steps)
  const urlStep = Number(params.get("step"));
  const initialStep = Number.isFinite(urlStep) ? Math.max(0, Math.min(1, urlStep)) : 0;
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
          // Removed subjects state - field removed per client feedback
  const [states, setStates] = useState([]);
  const [parentId, setParentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [checkingStudents, setCheckingStudents] = useState(true);
  const isInitialMountRef = React.useRef(true);

  // Fetch dropdown options (classes, states) when on step 0 (form)
  useEffect(() => {
    const fetchDropdowns = async () => {
      if (step === 0) {
        setLoadingDropdowns(true);
        try {
          const [classesRes, statesRes] = await Promise.all([
            api.get("/allclasses"),
            api.get("/states")
          ]);
          
          const allClasses = Array.isArray(classesRes.data) 
            ? classesRes.data 
            : (classesRes.data?.data || []);
          setClasses(allClasses);
          
          const allStates = Array.isArray(statesRes.data) 
            ? statesRes.data 
            : (statesRes.data?.data || []);
          setStates(allStates);
        } catch (error) {
          // Error fetching dropdown options - silently continue
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
          
          // Flow now starts directly at form (step 0), no auto-skip needed
        }
        
        // Fetch classes for display
        const classesRes = await api.get("/allclasses");
        const allClasses = Array.isArray(classesRes.data) 
          ? classesRes.data 
          : (classesRes.data?.data || []);
        setClasses(allClasses);
      } catch (error) {
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
    // From form, go back to home
    navigate("/parent/home");
  };

  const onCreate = async (values) => {
    setSubmitting(true);
    try {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      // Check if this is the first child (before creating)
      const isFirstChild = students.length === 0;

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
        // Subjects field removed per client feedback
      };

      const userRes = await api.post("/adduser", userBody);
      const createdUser = userRes?.data?.user || userRes?.data;
      
      if (!createdUser?.id) {
        throw new Error("Failed to create user account");
      }

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
          // Could not update student profile - continue anyway, student was created successfully
        }
      }
      
      // Refresh students list
      const updatedStudentsRes = await api.get("/allstudents");
      const updatedAllStudents = Array.isArray(updatedStudentsRes.data) 
        ? updatedStudentsRes.data 
        : (updatedStudentsRes.data?.data || []);
      const updatedParentStudents = updatedAllStudents.filter(s => s.parent_id === finalParentId);
      setStudents(updatedParentStudents);
      
      // Show success message in German with key to prevent duplicates
      message.success({ 
        content: "Schüler erfolgreich erstellt!",
        key: "student-created-success",
        duration: 3
      });
      
      // If this is the first child, redirect to add another child intro page
      // For subsequent children, redirect to home (next step)
      if (isFirstChild) {
        navigate("/parent/myfamily/add-another-child-intro", { replace: true });
      } else {
        navigate("/parent/home", { replace: true });
      }
      return; // Exit early to prevent onboarding flow from interfering

      try {
        const onboardingActive = sessionStorage.getItem(ONBOARDING_FLAG_KEY) === "1";
        if (onboardingActive) {
          const onboardingNext =
            sessionStorage.getItem(ONBOARDING_NEXT_KEY) || "/parent";
          const onboardingReturn =
            sessionStorage.getItem(ONBOARDING_RETURN_KEY) || "/signup/choose-subscription";
          const backTarget =
            onboardingReturn === "/signup/add-child/another" ? "/signup/add-child" : "/signup/add-child/another";

          sessionStorage.removeItem(ONBOARDING_FLAG_KEY);
          sessionStorage.removeItem(ONBOARDING_NEXT_KEY);
          sessionStorage.removeItem(ONBOARDING_RETURN_KEY);

          navigate(onboardingReturn, {
            replace: true,
            state: { next: onboardingNext, back: backTarget },
          });
          return;
        }
      } catch {
        // ignore storage issues
      }
    } catch (e) {
      message.error(
        t("parent.addStudent.toast.createFailed", "Could not create student.") + 
        (e?.response?.data?.message ? `: ${e.response.data.message}` : "")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking if parent has students
  if (checkingStudents && step !== 0 && step !== 1) {
    return (
      <CircularBackground>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </CircularBackground>
    );
  }

  const inputClass =
    "h-11 sm:h-12 w-full rounded-2xl border border-[#E9DED2] bg-white px-3 sm:px-4 text-sm sm:text-base text-[#4F3A2D] placeholder:text-[#BCB1A8] shadow-[0_6px_16px_rgba(87,60,42,0.08)] focus:border-[#FF9A36] focus:shadow-[0_10px_24px_rgba(255,154,54,0.28)] transition";

  return (
    <CircularBackground>
      <div className="flex flex-col items-center w-full px-4 sm:px-6 md:px-8">
        {/* Back button and title */}
        <div className="w-full max-w-7xl mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Button 
              type="text" 
              icon={<LeftOutlined />} 
              onClick={() => navigate("/parent/home")}
              className="!p-0 !h-auto text-neutral-700"
            />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-800 mb-0">
              Schülerdetails
            </h1>
          </div>

        {/* ---------- Step 0: Form ---------- */}
        {step === 0 && (
          <div className="w-full max-w-7xl !pb-5" style={{ paddingBottom: '20px' }}>
            <Form
              key="add-student-step2"
              layout="vertical"
              requiredMark={false}
              onFinish={onCreate}
              className="space-y-0 pb-0"
              colon={false}
            >
              <Form.Item
                name="first_name"
                rules={[
                  { required: true, message: t("errors.required", "This field is required.") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
                className="mb-3"
                label={<span className="hidden">First Name</span>}
              >
                <Input 
                  placeholder="Vorname"
                  className={inputClass}
                />
              </Form.Item>

              <Form.Item
                name="last_name"
                rules={[
                  { required: true, message: t("errors.required", "This field is required.") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
                className="mb-3"
                label={<span className="hidden">Last Name</span>}
              >
                <Input 
                  placeholder="Nachname"
                  className={inputClass}
                />
              </Form.Item>

              <Form.Item
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
                className="mb-3"
                label={<span className="hidden">Age</span>}
              >
                <Input 
                  type="number" 
                  placeholder="8" 
                  min={4} 
                  max={18}
                  className={inputClass}
                />
              </Form.Item>

              <Form.Item
                name="class_id"
                rules={[{ required: true, message: t("errors.required", "This field is required.") }]}
                className="mb-3"
                label={<span className="hidden">Class</span>}
              >
                <Select
                  placeholder="Klasse auswählen"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={classes
                    .filter((c) => {
                      const className = (c.class_name || "").toLowerCase();
                      return /(grade|klasse|class)\s*[1-4]|[1-4]\s*(grade|klasse|class)|^[1-4]$/.test(className);
                    })
                    .map((c) => ({
                      value: c.id,
                      label: c.class_name || `Class ${c.id}`,
                    }))}
                  loading={loadingDropdowns}
                  className="add-student-select"
                  classNames={{ popup: "rounded-2xl" }}
                  suffixIcon={<DownOutlined className="text-[#BCB1A8]" />}
                />
              </Form.Item>

              <Form.Item
                name="state"
                rules={[{ required: true, message: t("errors.required", "This field is required.") }]}
                className="mb-3"
                label={<span className="hidden">State</span>}
              >
                <Select
                  placeholder="Bundesland auswählen"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  options={states.map((s) => ({
                    value: s.state_name || s.name || String(s),
                    label: s.state_name || s.name || String(s),
                  }))}
                  loading={loadingDropdowns}
                  className="add-student-select"
                  classNames={{ popup: "rounded-2xl" }}
                  suffixIcon={<DownOutlined className="text-[#BCB1A8]" />}
                />
              </Form.Item>

              <Form.Item
                name="school"
                className="mb-0"
                label={<span className="hidden">School (Optional)</span>}
              >
                <Input 
                  placeholder="Schulname eingeben (fakultativ)"
                  className={inputClass}
                />
              </Form.Item>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 sm:gap-3 mt-12 sm:mt-16">
                <Button 
                  onClick={() => navigate("/parent/home")}
                  className="h-12 px-4 sm:px-6 rounded-2xl text-sm sm:text-base order-2 sm:order-1"
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={submitting}
                  className="h-12 px-4 sm:px-6 rounded-2xl !bg-[#FF9A36] hover:!bg-[#FF8A1A] border-none text-sm sm:text-base order-1 sm:order-2"
                >
                  Erstellen
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* ---------- Step 1: Success ---------- */}
        {step === 1 && (
          <div className="w-full max-w-7xl flex flex-col items-center text-center">
            <CheckCircleFilled className="text-emerald-500 mb-4" style={{ fontSize: "80px" }} />
            <Title level={3} className="!mb-2">
              {t("parent.addStudent.successTitle", "All set!")}
            </Title>
            <Text className="text-neutral-600 block mb-6">
              {t(
                "parent.addStudent.successText",
                "We'll take you back to the home screen. Your student can log in independently from there."
              )}
            </Text>
            <Space direction="vertical" className="w-full">
              <Button 
                type="primary" 
                onClick={() => navigate("/parent/home")}
                className="w-full h-12 rounded-2xl !bg-[#FF9A36] hover:!bg-[#FF8A1A] border-none"
              >
                {t("parent.addStudent.backHome", "Continue")}
              </Button>
              <Button 
                onClick={() => {
                  setStep(0);
                  navigate("/parent/myfamily/add-student-flow?step=0", { replace: true });
                }}
                className="w-full h-12 rounded-2xl"
              >
                {t("parent.addStudent.addAnother", "Add another student")}
              </Button>
            </Space>
          </div>
        )}
        </div>
      </div>
      
      {/* Custom styles for Select components */}
      <style>{`
        .add-student-select .ant-select-selector {
          height: 44px !important;
          min-height: 44px !important;
          border-radius: 1rem !important;
          border: 1px solid #E9DED2 !important;
          background-color: white !important;
          box-shadow: 0 6px 16px rgba(87,60,42,0.08) !important;
          padding: 0 16px !important;
        }
        .add-student-select .ant-select-selector:hover {
          border-color: #E9DED2 !important;
        }
        .add-student-select.ant-select-focused .ant-select-selector {
          border-color: #FF9A36 !important;
          box-shadow: 0 10px 24px rgba(255,154,54,0.28) !important;
        }
        .add-student-select .ant-select-selection-item {
          line-height: 42px !important;
          color: #4F3A2D !important;
          font-size: 16px !important;
        }
        .add-student-select .ant-select-selection-placeholder {
          line-height: 42px !important;
          color: #BCB1A8 !important;
          font-size: 16px !important;
        }
        @media (max-width: 640px) {
          .add-student-select .ant-select-selector {
            height: 44px !important;
            min-height: 44px !important;
            padding: 0 12px !important;
          }
          .add-student-select .ant-select-selection-item,
          .add-student-select .ant-select-selection-placeholder {
            line-height: 42px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </CircularBackground>
  );
}
