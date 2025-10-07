import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
} from "antd";
import {
  PlusOutlined,
  LeftOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/** Replace with backend fetch */
const MOCK_STUDENTS = [
  { id: 1, first_name: "Sophia", last_name: "", status: "Active", avatar: "https://i.pravatar.cc/120?img=5" },
  { id: 2, first_name: "Ethan", last_name: "", status: "Active", avatar: "https://i.pravatar.cc/120?img=12" },
];

export default function AddStudentFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // 0:intro, 1:list, 2:form, 3:success
  const urlStep = Number(params.get("step"));
  const initialStep = Number.isFinite(urlStep) ? Math.max(0, Math.min(3, urlStep)) : 0;
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(3, s + 1));

  const onCreate = async (values) => {
    setSubmitting(true);
    try {
      // TODO: call your backend API here
      await new Promise((r) => setTimeout(r, 600));
      message.success(t("parent.addStudent.toast.created", "Student created."));
      setStep(3);
    } catch (e) {
      message.error(t("parent.addStudent.toast.createFailed", "Could not create student."));
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
            {MOCK_STUDENTS.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MOCK_STUDENTS.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"
                  >
                    <BuddyAvatar src={s.avatar} size={56} />
                    <div className="leading-tight">
                      <div className="font-semibold">
                        {s.first_name} {s.last_name}
                      </div>
                      <Text type="secondary">{s.status}</Text>
                    </div>
                  </div>
                ))}
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
                <Input placeholder="3" />
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
