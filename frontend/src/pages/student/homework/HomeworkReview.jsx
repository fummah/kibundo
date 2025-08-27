import { useState } from "react";
import { Typography, Card, Upload, Button, Space, Alert, message, Checkbox, Progress } from "antd";
import { ArrowLeft, Camera, CheckCircle2, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const { Title, Text } = Typography;

/**
 * Optional query params supported:
 *   ?taskId=123&subject=Math&desc=Fractions%20Q1-5
 * If not provided, UI falls back to generic labels.
 */
export default function HomeworkReview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const taskId = params.get("taskId");
  const subject = params.get("subject") || "Homework";
  const desc = params.get("desc") || "Finished worksheet";

  const [img, setImg] = useState(null);
  const [checks, setChecks] = useState({
    readable: false,
    nameVisible: false,
    allQuestionsAnswered: false,
    neatnessOk: false,
  });
  const [checkRan, setCheckRan] = useState(false);
  const [score, setScore] = useState(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const beforeUpload = (file) => {
    setImg(file);
    message.success("Photo added — running quick checks is optional.");
    return false; // prevent auto upload; keep it local for now
  };

  const runAutoCheck = async () => {
    if (!img) return message.warning("Please add a photo first.");
    // Mock “completeness” heuristic
    setCheckRan(true);
    const fakeScore = 80 + Math.floor(Math.random() * 20); // 80–99
    setScore(fakeScore);

    // Pre-tick some checks to simulate ‘looks good’
    setChecks({
      readable: true,
      nameVisible: Math.random() > 0.3,
      allQuestionsAnswered: Math.random() > 0.15,
      neatnessOk: Math.random() > 0.25,
    });
    message.success("Auto-check complete!");
  };

  const toggle = (key) => setChecks((c) => ({ ...c, [key]: !c[key] }));

  const allOk = Object.values(checks).every(Boolean);

  const notifyParents = async () => {
    setSending(true);
    try {
      // Mock call — replace with your real endpoint
      // await fetch("/api/notifications/parents/homework-complete", { method: "POST", body: ... })
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
      message.success("Parents notified — great job!");
    } catch (e) {
      message.error("Could not notify parents right now.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-3 md:px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="p-2 rounded-full hover:bg-neutral-100"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">After-Task Review</Title>
      </div>

      {/* Summary strip */}
      <Card className="rounded-2xl mb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-500">Task</div>
            <div className="font-semibold">{subject}</div>
            <div className="text-neutral-600 text-sm">{desc}</div>
            {taskId && <div className="text-xs text-neutral-400 mt-1">ID: {taskId}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-500">Status</div>
            <div className={`font-semibold ${submitted ? "text-green-600" : "text-blue-600"}`}>
              {submitted ? "Completed & Reported" : "Awaiting review"}
            </div>
          </div>
        </div>
      </Card>

      {/* Upload result photo */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">1) Add a photo of your finished work</Title>
        <Upload.Dragger
          accept="image/*"
          beforeUpload={beforeUpload}
          showUploadList={false}
          className="!rounded-xl"
        >
          <p className="ant-upload-drag-icon"><Camera /></p>
          <p className="ant-upload-text">Tap to take a photo / upload</p>
        </Upload.Dragger>

        {img && (
          <div className="mt-3">
            <img
              src={URL.createObjectURL(img)}
              alt="finished homework"
              className="w-full max-w-md rounded-xl border"
            />
          </div>
        )}
      </Card>

      {/* Quick completeness check */}
      <Card className="rounded-2xl mb-3">
        <div className="flex items-center justify-between">
          <Title level={5} className="!mb-2">2) Quick check</Title>
          <Button onClick={runAutoCheck} disabled={!img} className="rounded-xl">
            Run auto-check
          </Button>
        </div>

        {checkRan && (
          <div className="mb-3">
            <Text type="secondary">Auto-check score</Text>
            <Progress percent={score ?? 0} className="!mb-0" />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2">
          <Checkbox checked={checks.readable} onChange={() => toggle("readable")}>
            The photo is clear and readable
          </Checkbox>
          <Checkbox checked={checks.nameVisible} onChange={() => toggle("nameVisible")}>
            My name/class is visible (if required)
          </Checkbox>
          <Checkbox checked={checks.allQuestionsAnswered} onChange={() => toggle("allQuestionsAnswered")}>
            All questions are answered
          </Checkbox>
          <Checkbox checked={checks.neatnessOk} onChange={() => toggle("neatnessOk")}>
            It looks neat and complete
          </Checkbox>
        </div>

        {!allOk && (
          <Alert
            className="rounded-xl mt-3"
            type="info"
            message="Almost there!"
            description="Tick each item to confirm your work is complete. You can retake the photo if needed."
            showIcon
          />
        )}
      </Card>

      {/* Submit / notify parents */}
      <Card className="rounded-2xl">
        <Title level={5} className="!mb-2">3) Finish</Title>
        <Space wrap>
          <Button
            type="primary"
            disabled={!img || !allOk || submitted}
            loading={sending}
            icon={<Send className="w-4 h-4" />}
            className="rounded-xl"
            onClick={notifyParents}
          >
            Mark as done & notify parents
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => navigate("/student/homework/tasks")}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Back to My Tasks
          </Button>
        </Space>

        {submitted && (
          <Alert
            className="rounded-xl mt-3"
            type="success"
            message="Great job! 🎉"
            description="Your parents have been notified that your homework is complete."
            showIcon
          />
        )}
      </Card>
    </div>
  );
}
