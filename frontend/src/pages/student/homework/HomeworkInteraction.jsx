import { useState, useRef, useEffect } from "react";
import {
  Typography,
  Card,
  Upload,
  Button,
  Input,
  Tag,
  message,
  Row,
  Col,
  Space,
} from "antd";
import { Camera, Mic, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat";

import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";

import { ocrImage } from "@/api/reading.js";
import { buildWorksheetSignature } from "@/utils/worksheetSignature.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function HomeworkInteraction() {
  const navigate = useNavigate();
  const location = useLocation();

  const { state } = useStudentApp();
  const { user } = useAuthContext();

  const buddy = state?.buddy;
  const displayName =
    state?.profile?.name ||
    user?.first_name ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : "Student");

  const [chat, setChat] = useState([
    { role: "assistant", text: "Hi! What homework do you have today?" },
  ]);
  const [pending, setPending] = useState("");
  const [img, setImg] = useState(null);

  const [editor, setEditor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [signature, setSignature] = useState("");
  const [duplicateOf, setDuplicateOf] = useState(null);
  const [ocrText, setOcrText] = useState("");

  const cameraCaptureRef = useRef(null);
  const preloadedRef = useRef(false);

  const taskId = signature ? `worksheet:${signature}` : "worksheet:unspecified";
  const { running, elapsedMs, start, pause, reset, flush } = useTaskTimer(
    taskId,
    { subject: "unknown", source: "homework_upload" },
    false
  );

  const pushUser = (text) => setChat((c) => [...c, { role: "user", text }]);
  const pushAssistant = (text) =>
    setChat((c) => [...c, { role: "assistant", text }]);

  // --- Reusable process-flow used by both Upload.Dragger and preloaded image ---
  const beforeUpload = async (file) => {
    setImg(file);
    message.loading({
      content: "Reading your photo…",
      key: "ocr",
      duration: 0,
    });
    try {
      const text = await ocrImage(file);
      setOcrText(text);
      const sig = await buildWorksheetSignature({ file, ocrText: text });
      setSignature(sig);

      const r = await fetch("/api/worksheets/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: sig,
          editor,
          publisher,
          tags: { subject: "unknown" },
          text,
        }),
      });
      const data = r.ok ? await r.json() : {};
      setDuplicateOf(data.duplicateOf || null);

      pushAssistant("I extracted the text from your photo. Ready to begin?");
      message.success({
        content: "Text detected! Add tags then click Start Working.",
        key: "ocr",
      });
    } catch {
      message.error({ content: "Could not read the image, try again.", key: "ocr" });
    }
    return false; // prevent auto-upload
  };

  // If we navigated here from Start.jsx with an image, auto-process it
  useEffect(() => {
    const imgDataUrl = location.state?.image;
    if (!preloadedRef.current && imgDataUrl) {
      preloadedRef.current = true;
      (async () => {
        try {
          const res = await fetch(imgDataUrl);
          const blob = await res.blob();
          const file = new File([blob], "homework.jpg", {
            type: blob.type || "image/jpeg",
          });
          await beforeUpload(file);
        } catch {
          // Best-effort: if fetch fails, ignore silently
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleTextSend = () => {
    if (!pending.trim()) return;
    pushUser(pending.trim());
    setPending("");
    setTimeout(() => {
      pushAssistant(
        "Thanks! I’ll check what type of task this is. If it’s solvable (math/grammar), I’ll guide you step-by-step. If it’s creative, I’ll switch to motivational mode!"
      );
    }, 300);
  };

  const finishAndSubmit = async () => {
    flush("completed", { editor, publisher, signature, duplicateOf });
    pause();
    message.success(
      `Great job! Time spent: ${new Date(Math.max(0, elapsedMs))
        .toISOString()
        .substr(11, 8)}`
    );
  };

  const quick = [
    "It’s a math worksheet (fractions).",
    "Grammar: underline the verbs.",
    "Creative: draw a volcano.",
  ];

  const hhmmss = new Date(Math.max(0, elapsedMs)).toISOString().substr(11, 8);

  return (
    // Scrollable in ALL views; keeps content above the chat strip
    <div className="relative px-3 md:px-6 py-4 mx-auto w-full max-w-5xl min-h-[100svh] lg:h-full overflow-y-auto">
      {/* Header: Back + Greeting + Timer */}
      <div className="flex items-center gap-3 pt-2 pb-3 flex-wrap">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1 min-w-[240px]">
          <GreetingBanner
            avatarSrc={buddy?.avatar}
            title={`Hi ${displayName}, `}
            subtitle="Share a photo or describe your worksheet. I’ll guide you step-by-step to solve your homework!"
            translucent
          />
        </div>
        <div className="ml-auto text-xs text-neutral-500">⏱ {hhmmss}</div>
      </div>

      {/* Chat */}
      <Card className="rounded-2xl mb-4" bodyStyle={{ padding: 14 }}>
        <div className="space-y-3" aria-live="polite">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-6 ${
                  m.role === "assistant"
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {img && (
            <div className="flex justify-end">
              <img
                src={URL.createObjectURL(img)}
                alt="Worksheet"
                className="w-full max-w-md md:max-w-lg h-auto rounded-xl border object-contain"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Capture + tags + timer */}
      <Card className="rounded-2xl mb-4" bodyStyle={{ padding: 14 }}>
        <Row gutter={[16, 16]}>
          {/* Upload + tags */}
          <Col xs={24} md={12}>
            <div className="space-y-2">
              <Title level={5} className="!mb-1">
                1) Add a worksheet
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
                  JPG/PNG. We’ll run OCR to read your task.
                </p>
              </Upload.Dragger>

              {/* Optional direct camera capture */}
              <div className="mt-2">
                <input
                  ref={cameraCaptureRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && beforeUpload(e.target.files[0])
                  }
                />
                <Button
                  onClick={() => cameraCaptureRef.current?.click()}
                  icon={<Camera className="w-4 h-4" />}
                  className="rounded-xl"
                >
                  Use Camera
                </Button>
              </div>

              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <Input
                    placeholder="Editor (e.g., Ms. Lee)"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Input
                    placeholder="Publisher (e.g., Oxford)"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                </Col>
              </Row>

              {signature && (
                <div className="text-xs text-neutral-600">
                  Signature: <code>{signature}</code>{" "}
                  {duplicateOf ? (
                    <Tag color="red">Duplicate of {duplicateOf}</Tag>
                  ) : (
                    <Tag color="green">New</Tag>
                  )}
                </div>
              )}

              {ocrText && (
                <div className="mt-2 p-2 rounded-xl bg-neutral-50 max-h-48 overflow-auto">
                  <Text strong>Extracted text:</Text>
                  <div className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                    {ocrText}
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Describe + timer */}
          <Col xs={24} md={12}>
            <div className="space-y-2">
              <Title level={5} className="!mb-1">
                2) Describe your homework
              </Title>
              <TextArea
                rows={4}
                value={pending}
                onChange={(e) => setPending(e.target.value)}
                placeholder="Example: 'Math page 14, questions 1–5 (fractions)'"
                className="rounded-xl"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="primary"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleTextSend}
                  className="rounded-xl"
                >
                  Send
                </Button>
                <Button onClick={() => setPending("")} className="rounded-xl">
                  Clear
                </Button>
                <Button
                  icon={<Mic className="w-4 h-4" />}
                  className="rounded-xl"
                  onClick={() =>
                    pushAssistant("Recording… say your task. (Mock)")
                  }
                >
                  Record voice
                </Button>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-white border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-neutral-500">Time on task</div>
                  <div className="font-mono tabular-nums text-lg">{hhmmss}</div>
                </div>
                <Space wrap>
                  {!running ? (
                    <Button onClick={start} className="rounded-xl">
                      Start Working
                    </Button>
                  ) : (
                    <Button onClick={pause} className="rounded-xl">
                      Pause
                    </Button>
                  )}
                  <Button onClick={reset} className="rounded-xl">
                    Reset
                  </Button>
                  <Button
                    type="primary"
                    onClick={finishAndSubmit}
                    className="rounded-xl"
                  >
                    Finish & Submit
                  </Button>
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        {/* Quick prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {["It’s a math worksheet (fractions).", "Grammar: underline the verbs.", "Creative: draw a volcano."].map(
            (t, i) => (
              <Tag
                key={i}
                onClick={() => {
                  pushUser(t);
                  setTimeout(
                    () => pushAssistant("Got it! Let’s start together."),
                    200
                  );
                }}
                className="cursor-pointer px-2 py-1 rounded-xl bg-neutral-50"
              >
                {t}
              </Tag>
            )
          )}
        </div>
      </Card>

      {/* Info strip */}
      <Card className="rounded-2xl" bodyStyle={{ padding: 14 }}>
        <Title level={5} className="!mb-1">
          What happens next?
        </Title>
        <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
          <li>
            We classify the task: <b>Type A</b> (solvable) or <b>Type B</b> (creative/manual).
          </li>
          <li>
            For Type A, your buddy guides you step-by-step — without giving away the final answer.
          </li>
          <li>
            For Type B, motivation mode starts: praise, short missions, optional timers or music.
          </li>
          <li>
            After you finish, upload a photo and we’ll notify your parents.
          </li>
        </ul>
      </Card>

      {/* Keep content above the fixed chat strip in all views */}
      <ChatStripSpacer />
    </div>
  );
}
