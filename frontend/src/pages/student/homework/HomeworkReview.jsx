// src/pages/student/homework/Review.jsx (or HomeworkReview.jsx)
import { useEffect, useRef, useState } from "react";
import {
  Typography,
  Card,
  Upload,
  Button,
  Space,
  Alert,
  message,
  Checkbox,
  Progress,
} from "antd";
import { Camera, CheckCircle2, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat";

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
  const [previewUrl, setPreviewUrl] = useState("");
  const cameraCaptureRef = useRef(null);

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

  // Generate & clean preview URL
  useEffect(() => {
    if (!img) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(img);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [img]);

  const beforeUpload = (file) => {
    setImg(file);
    message.success("Photo added — running quick checks is optional.");
    return false; // keep file local (no auto-upload)
  };

  const runAutoCheck = async () => {
    if (!img) return message.warning("Please add a photo first.");
    setCheckRan(true);

    // Simple mock score/heuristics
    const fakeScore = 80 + Math.floor(Math.random() * 20); // 80–99
    setScore(fakeScore);
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
    // Scrollable in all views; spacer at bottom keeps content above chat strip
    <div className="relative mx-auto w-full max-w-5xl px-3 md:px-6 py-4 min-h-[100svh] lg:h-full overflow-y-auto">
      {/* Header: Back + Banner */}
      <div className="flex items-center gap-3 pt-2 pb-3 flex-wrap">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1 min-w-[240px]">
          <GreetingBanner
            title="After-Task Review"
            subtitle={`${subject} — ${desc}`}
            className="!bg-white"
            translucent={false}
          />
        </div>
      </div>

      {/* Summary strip */}
      <Card className="rounded-2xl mb-3">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="text-sm text-neutral-500">Task</div>
            <div className="font-semibold">{subject}</div>
            <div className="text-neutral-600 text-sm">{desc}</div>
            {taskId && (
              <div className="text-xs text-neutral-400 mt-1">ID: {taskId}</div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-neutral-500">Status</div>
            <div
              className={`font-semibold ${
                submitted ? "text-green-600" : "text-blue-600"
              }`}
            >
              {submitted ? "Completed & Reported" : "Awaiting review"}
            </div>
          </div>
        </div>
      </Card>

      {/* Upload result photo */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">
          1) Add a photo of your finished work
        </Title>

        <Upload.Dragger
          accept="image/*"
          beforeUpload={beforeUpload}
          showUploadList={false}
          className="!rounded-xl"
        >
          <p className="ant-upload-drag-icon">
            <Camera />
          </p>
          <p className="ant-upload-text">Tap to take a photo / upload</p>
          <p className="ant-upload-hint text-xs">
            JPG/PNG. We’ll just attach it to your review.
          </p>
        </Upload.Dragger>

        {/* Optional direct camera capture (mobile-friendly) */}
        <div className="mt-2">
          <input
            ref={cameraCaptureRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && beforeUpload(e.target.files[0])}
          />
          <Button
            onClick={() => cameraCaptureRef.current?.click()}
            icon={<Camera className="w-4 h-4" />}
            className="rounded-xl"
          >
            Use Camera
          </Button>
        </div>

        {previewUrl && (
          <div className="mt-3">
            <img
              src={previewUrl}
              alt="finished homework"
              className="w-full max-w-md rounded-xl border object-contain"
            />
          </div>
        )}
      </Card>

      {/* Quick completeness check */}
      <Card className="rounded-2xl mb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Title level={5} className="!mb-2">
            2) Quick check
          </Title>
          <Button
            onClick={runAutoCheck}
            disabled={!img}
            className="rounded-xl"
          >
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
          <Checkbox
            checked={checks.readable}
            onChange={() => toggle("readable")}
          >
            The photo is clear and readable
          </Checkbox>
          <Checkbox
            checked={checks.nameVisible}
            onChange={() => toggle("nameVisible")}
          >
            My name/class is visible (if required)
          </Checkbox>
          <Checkbox
            checked={checks.allQuestionsAnswered}
            onChange={() => toggle("allQuestionsAnswered")}
          >
            All questions are answered
          </Checkbox>
          <Checkbox
            checked={checks.neatnessOk}
            onChange={() => toggle("neatnessOk")}
          >
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
        <Title level={5} className="!mb-2">
          3) Finish
        </Title>
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

      {/* Keep content above the fixed chat footer on mobile/desktop */}
      <ChatStripSpacer />
    </div>
  );
}
