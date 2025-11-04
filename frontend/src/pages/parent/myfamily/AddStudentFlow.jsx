import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
import ParentShell from "@/components/parent/ParentShell.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar";
import globalBg from "@/assets/backgrounds/global-bg.png";

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
  const [parentId, setParentId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch parent ID and students
  useEffect(() => {
    const fetchData = async () => {
      if (step === 1) {
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
          }
          
          // Fetch classes for grade mapping
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
        }
      }
    };
    
    fetchData();
  }, [step, t]);

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(3, s + 1));

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
      
      // Find class_id from grade number
      // Try to match by class_name containing the grade number
      const gradeNum = Number(values.grade);
      let classId = null;
      
      // Try to find a class that matches the grade
      const matchingClass = classes.find(c => {
        const className = (c.class_name || "").toLowerCase();
        return className.includes(`grade ${gradeNum}`) || 
               className.includes(`grade${gradeNum}`) ||
               className === `grade ${gradeNum}` ||
               className === `grade${gradeNum}`;
      });
      
      if (matchingClass) {
        classId = matchingClass.id;
      } else {
        // Fallback: use grade number as class_id if class exists with that ID
        const classExists = classes.find(c => c.id === gradeNum);
        if (classExists) {
          classId = gradeNum;
        } else {
          // Last resort: use grade number as class_id (may need backend to create it)
          classId = gradeNum;
        }
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
        state: values.city || "",
        class_id: classId,
        parent_id: finalParentId, // Set parent_id so student is linked to parent
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
        // Update student with additional profile info
        try {
          await api.put(`/students/${newStudent.id}`, {
            age: Number(values.age),
            school_type: values.school_type,
            city: values.city,
            school_name: values.school_name,
          });
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

  return (
    <ParentShell bgImage={globalBg}>
      <div className="mx-auto w-full max-w-[820px] py-6 px-4">
        {/* ---------- Step 0: Intro (with mascot) ---------- */}
        {step === 0 && (
          <Card className="rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="order-2 md:order-1">
                <Title level={3} className="!mb-2">
                  {t("parent.addStudent.introTitle", "Create a student account")}
                </Title>
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
                    onClick={goNext}
                  >
                    {t("parent.addStudent.add", "Add Student")}
                  </Button>
                </div>
              </div>

              <div className="order-1 md:order-2 flex justify-center">
              <BuddyAvatar src="/buddies/monster1.png" size={160} ring={false} />
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
                  const avatar = studentUser.avatar || `/buddies/monster${(s.id % 3) + 1}.png`;
                  
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setStep(2)}>
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
                <Button type="text" icon={<LeftOutlined />} onClick={goBack} />
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
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
              >
                <Input placeholder={t("parent.addStudent.lastName_ph", "Enter last name (optional)")} />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.age", "Age")}
                name="age"
                rules={[
                  { required: true, message: t("errors.required") },
                  {
                    validator: (_, v) => {
                      if (v === undefined || v === null || v === "") return Promise.reject();
                      const n = Number(v);
                      return n >= 4 && n <= 18
                        ? Promise.resolve()
                        : Promise.reject(new Error(t("errors.ageRange", "Age must be between 4 and 18.")));
                    },
                  },
                ]}
              >
                <Input type="number" placeholder="8" />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.grade", "Grade")}
                name="grade"
                rules={[{ required: true, message: t("errors.required") }]}
              >
                <Select
                  placeholder={t("parent.addStudent.grade_ph", "Select grade")}
                  options={Array.from({ length: 13 }, (_, i) => i + 1).map(grade => ({
                    value: grade,
                    label: `Grade ${grade}`
                  }))}
                />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.schoolType", "School type")}
                name="school_type"
                rules={[{ required: true, message: t("errors.required") }]}
              >
                <Select
                  placeholder={t("parent.addStudent.schoolType_ph", "Select school type")}
                  options={[
                    { value: "primary", label: t("school.primary", "Primary") },
                    { value: "secondary", label: t("school.secondary", "Secondary") },
                    { value: "other", label: t("school.other", "Other") },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.city", "City")}
                name="city"
                rules={[
                  { required: true, message: t("errors.required") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
              >
                <Input placeholder={t("parent.addStudent.city_ph", "Enter city")} />
              </Form.Item>

              <Form.Item
                label={t("parent.addStudent.schoolName", "Name of your school")}
                name="school_name"
                rules={[
                  { required: true, message: t("errors.required") },
                  { min: 2, message: t("errors.minChars", { n: 2 }) },
                ]}
              >
                <Input placeholder={t("parent.addStudent.schoolName_ph", "Enter school name")} />
              </Form.Item>

              <div className="flex items-center justify-end gap-2">
                <Button onClick={goBack}>{t("common.back", "Back")}</Button>
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
                  <Button onClick={() => setStep(2)}>
                    {t("parent.addStudent.addAnother", "Add another student")}
                  </Button>
                </Space>
              </div>
              <div className="order-1 md:order-2 flex justify-center">
                <BuddyAvatar
                  src="/buddies/monster1.png"
                  alt="Mascot"
                  size={160}
                  ring={false}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </ParentShell>
  );
}
