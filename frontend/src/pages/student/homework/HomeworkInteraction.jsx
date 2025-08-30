// src/pages/student/homework/HomeworkInteraction.jsx
import { useState } from "react";
import { Typography, Card, Upload, Button, Input, Space, Tag, message } from "antd";
import { ArrowLeft, Camera, Mic, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function HomeworkInteraction() {
  const navigate = useNavigate();
  const [chat, setChat] = useState([
    { role: "assistant", text: "Hi! What homework do you have today?" },
  ]);
  const [pending, setPending] = useState("");
  const [img, setImg] = useState(null);

  const pushUser = (text) => setChat((c) => [...c, { role: "user", text }]);
  const pushAssistant = (text) => setChat((c) => [...c, { role: "assistant", text }]);

  const handleTextSend = () => {
    if (!pending.trim()) return;
    pushUser(pending.trim());
    setPending("");
    // Mock classification + guidance
    setTimeout(() => {
      pushAssistant(
        "Thanks! I’ll check what type of task this is. If it’s solvable (math/grammar), I’ll guide you step-by-step. If it’s creative, I’ll switch to motivational mode with timers and music!"
      );
    }, 300);
  };

  const beforeUpload = (file) => {
    setImg(file);
    message.success("Photo added — I’ll read it with OCR.");
    setTimeout(() => {
      pushAssistant("I extracted the text from your photo. Ready to begin?");
    }, 400);
    return false; // prevent auto upload (handled client-side only for now)
  };

  const quick = [
    "It’s a math worksheet (fractions).",
    "Grammar: underline the verbs.",
    "Creative: draw a volcano.",
  ];

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
        <Title level={4} className="!mb-0">Homework Assistant</Title>
      </div>

      {/* Character/output area */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ padding: 14 }}>
        <div className="space-y-3">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-6 ${
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
                alt="worksheet"
                className="max-w-[60%] rounded-xl border"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Input / capture */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ padding: 14 }}>
        <div className="grid md:grid-cols-2 gap-3">
          {/* Capture column */}
          <div className="space-y-2">
            <Title level={5} className="!mb-1">Add a worksheet</Title>
            <Upload.Dragger
              accept="image/*"
              beforeUpload={beforeUpload}
              showUploadList={false}
              className="!rounded-xl"
            >
              <p className="ant-upload-drag-icon"><Camera /></p>
              <p className="ant-upload-text">Tap to take a photo / upload</p>
              <p className="ant-upload-hint text-xs">
                JPG/PNG. We’ll run OCR to read your task.
              </p>
            </Upload.Dragger>

            <div className="flex gap-2">
              <Button
                icon={<Mic className="w-4 h-4" />}
                className="rounded-xl"
                onClick={() => pushAssistant("Recording… say your task. (Mock)")}
              >
                Record voice
              </Button>
              <Button
                className="rounded-xl"
                onClick={() => pushAssistant("Okay! Tell me about your homework. (Mock)")}
              >
                Describe task
              </Button>
            </div>
          </div>

          {/* Text compose column */}
          <div className="space-y-2">
            <Title level={5} className="!mb-1">Describe your homework</Title>
            <TextArea
              rows={4}
              value={pending}
              onChange={(e) => setPending(e.target.value)}
              placeholder="Example: 'Math page 14, questions 1–5 (fractions)'"
              className="rounded-xl"
            />
            <div className="flex gap-2">
              <Button
                type="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={handleTextSend}
                className="rounded-xl"
              >
                Send
              </Button>
              <Button onClick={() => setPending("")} className="rounded-xl">Clear</Button>
            </div>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.map((t, i) => (
            <Tag
              key={i}
              onClick={() => {
                pushUser(t);
                setTimeout(() => pushAssistant("Got it! Let’s start together."), 200);
              }}
              className="cursor-pointer px-2 py-1 rounded-xl bg-neutral-50"
            >
              {t}
            </Tag>
          ))}
        </div>
      </Card>

      {/* Info strip */}
      <Card className="rounded-2xl" bodyStyle={{ padding: 14 }}>
        <Title level={5} className="!mb-1">What happens next?</Title>
        <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
          <li>We classify the task: <b>Type A</b> (solvable) or <b>Type B</b> (creative/manual).</li>
          <li>For Type A, your buddy guides you step-by-step — without giving away the final answer.</li>
          <li>For Type B, motivation mode starts: praise, short missions, optional timers or music.</li>
          <li>After you finish, upload a photo and we’ll notify your parents.</li>
        </ul>
      </Card>
    </div>
  );
}
