// src/pages/student/reading/AiReadingTextFlow.jsx
import { useEffect, useState } from "react";
import { Card, Typography, Button, Space, Alert, Segmented } from "antd";
import { Mic, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateReadingText, sttCaptureMock } from "@/api/reading.js";
import { diffTranscript } from "@/utils/diffTranscript.js";

const { Title, Text } = Typography;

export default function AiReadingTextFlow() {
  const navigate = useNavigate();

  const [level, setLevel] = useState(2); // 1=beginner, 2=intermediate, 3=advanced
  const [loadingText, setLoadingText] = useState(true);
  const [text, setText] = useState("");

  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [result, setResult] = useState(null); // { score, tokens: [{ text, type }] }

  useEffect(() => {
    (async () => {
      await regenerateText(level);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateText = async (lvl) => {
    setLoadingText(true);
    setText("");
    setSpoken("");
    setResult(null);
    const t = await generateReadingText({ level: Number(lvl) || 1 });
    setText(t);
    setLoadingText(false);
  };

  const handleRecord = async () => {
    setRecording(true);
    const transcript = await sttCaptureMock();
    setRecording(false);
    setSpoken(transcript);
    setResult(diffTranscript(text, transcript));
  };

  const resetAll = () => {
    setSpoken("");
    setResult(null);
  };

  const accuracyPct = result ? Math.round((result.score || 0) * 100) : null;

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
        <Title level={4} className="!mb-0">AI Reading Text</Title>
      </div>

      {/* Level + Generate */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ padding: 14 }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Text type="secondary">Difficulty</Text>
            <Segmented
              options={[
                { label: "Beginner", value: 1 },
                { label: "Intermediate", value: 2 },
                { label: "Advanced", value: 3 },
              ]}
              value={level}
              onChange={(val) => {
                setLevel(val);
                regenerateText(val);
              }}
            />
          </div>
          <Button
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => regenerateText(level)}
            className="rounded-xl"
          >
            New text
          </Button>
        </div>
      </Card>

      {/* Reading passage */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">Read this aloud</Title>
        <div className="text-sm leading-7 bg-neutral-50 rounded-xl p-3 min-h-[64px]">
          {loadingText ? "Loading..." : text}
        </div>
      </Card>

      {/* Controls + user transcript */}
      <Card className="rounded-2xl mb-3">
        <Space wrap>
          <Button
            type="primary"
            size="large"
            icon={<Mic className="w-4 h-4" />}
            onClick={handleRecord}
            loading={recording || loadingText}
            disabled={loadingText}
            className="rounded-xl"
          >
            {recording ? "Listening..." : "Start Microphone (mock)"}
          </Button>
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={resetAll}
            disabled={!spoken && !result}
            className="rounded-xl"
          >
            Reset
          </Button>
        </Space>

        {spoken && (
          <div className="mt-3">
            <Text strong>Your reading (transcript):</Text>
            <div className="mt-1 text-sm leading-6 whitespace-pre-wrap bg-white rounded-xl p-3 border">
              {spoken}
            </div>
          </div>
        )}
      </Card>

      {/* Feedback */}
      {result && (
        <Card className="rounded-2xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Title level={5} className="!mb-2">Coach feedback</Title>
            <div className="text-sm text-neutral-600">
              Accuracy: <span className="font-semibold">{accuracyPct}%</span>
            </div>
          </div>

          {result.score >= 0.9 ? (
            <Alert
              type="success"
              message="Great reading! ⭐ Keep that smooth pace."
              showIcon
              className="rounded-xl"
            />
          ) : (
            <Alert
              type="warning"
              message="Almost there! Try again and watch the highlighted parts."
              showIcon
              className="rounded-xl"
            />
          )}

          {/* Token-by-token highlighting of the expected passage */}
          <div className="mt-3 text-sm leading-7 bg-white rounded-xl p-3 border">
            {result.tokens.map((t, i) => {
              if (t.type === "missing") {
                return (
                  <mark key={i} className="bg-red-200 rounded px-0.5">
                    {t.text}
                  </mark>
                );
              }
              if (t.type === "mismatch") {
                return (
                  <span key={i} className="bg-amber-200 rounded px-1">
                    {t.text}
                  </span>
                );
              }
              // ok
              return <span key={i}>{t.text}</span>;
            }).map((el, idx, arr) => (
              // add spaces between tokens
              <span key={`w-${idx}`}>{el}{idx < arr.length - 1 ? " " : ""}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
