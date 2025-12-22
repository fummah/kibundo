import { useEffect, useRef, useState } from "react";
import { Card, Typography, Button, Alert, Segmented, message, Dropdown, Tag } from "antd";
import { Mic, RefreshCw, Sparkles, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
// ChatStripSpacer removed - not needed

import { generateReadingText, sttCaptureMock } from "@/api/reading.js";
import { diffTranscript } from "@/utils/diffTranscript.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;

const LEVEL_OPTIONS = [
  { label: "Beginner", value: 1 },
  { label: "Intermediate", value: 2 },
  { label: "Advanced", value: 3 },
];

const LEVEL_LABEL = (val) => LEVEL_OPTIONS.find((o) => o.value === Number(val))?.label || "Beginner";

export default function AiReadingTextFlow() {
  const navigate = useNavigate();

  const [level, setLevel] = useState(2);
  const [loadingText, setLoadingText] = useState(true);
  const [text, setText] = useState("");

  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [result, setResult] = useState(null);
  const flushedRef = useRef(false);

  const { running, elapsedMs, start, pause, reset, flush } = useTaskTimer(
    "reading:ai_text",
    { mode: "ai_text", level },
    true
  );

  useEffect(() => {
    // initial load
    regenerateText(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (!flushedRef.current) {
        flush("abandoned", { level });
        flushedRef.current = true;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const regenerateText = async (lvl) => {
    try {
      setLoadingText(true);
      setText("");
      setSpoken("");
      setResult(null);
      const t = await generateReadingText({ level: Number(lvl) || 1 });
      setText(t || "");
    } catch (e) {
      message.error("Could not generate text, please try again.");
    } finally {
      setLoadingText(false);
    }
  };

  const handleRecord = async () => {
    setRecording(true);
    const transcript = await sttCaptureMock();
    setRecording(false);
    setSpoken(transcript || "");
    if (text) setResult(diffTranscript(text || "", transcript || ""));
    else setResult(null);
  };

  const resetAll = () => {
    setSpoken("");
    setResult(null);
    reset();
  };

  const finish = () => {
    const accuracy = result?.score ?? 0;
    flush("completed", { accuracy, level, elapsedMs });
    flushedRef.current = true;
    pause();
    message.success("Great work! Saved your time & accuracy.");
  };

  const onLevelChange = (val) => {
    setLevel(val);
    regenerateText(val);
  };

  const accuracyPct = result ? Math.round((result.score || 0) * 100) : null;
  const hhmmss = new Date(elapsedMs).toISOString().substr(11, 8);

  return (
    // Scrollable in ALL views; keeps content above the chat strip
    <div className="relative mx-auto w-full max-w-5xl px-3 md:px-6 py-4 overflow-y-auto min-h-[100svh] md:min-h-0 md:h-full lg:min-h-0 lg:h-full">
      {/* Header with Back + Greeting + Timer */}
      <div className="flex items-center gap-3 pt-6 mb-4">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1">
          <GreetingBanner
            title="AI Reading Text"
            subtitle="Generate a passage and read it aloud."
            className="!bg-white"
            translucent={false}
          />
        </div>
        <div className="text-xs text-neutral-500 whitespace-nowrap">⏱ {hhmmss}</div>
      </div>

      {/* Difficulty + regenerate */}
      <Card className="rounded-2xl mb-3" styles={{ body: { padding: 14 } }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Text type="secondary">Difficulty</Text>

            {/* Desktop / md+: Segmented (unchanged UX) */}
            <div className="hidden md:block">
              <Segmented
                options={LEVEL_OPTIONS}
                value={level}
                onChange={onLevelChange}
              />
            </div>

            {/* Mobile: vertical dotted button (⋮) opens dropdown */}
            <div className="md:hidden">
              <div className="flex items-center gap-2">
                <Tag className="!m-0" color="gold">{LEVEL_LABEL(level)}</Tag>
                <Dropdown
                  trigger={["click"]}
                  placement="bottomRight"
                  menu={{
                    items: LEVEL_OPTIONS.map((o) => ({ key: String(o.value), label: o.label })),
                    onClick: ({ key }) => onLevelChange(Number(key)),
                  }}
                >
                  <Button
                    shape="circle"
                    className="!w-10 !h-10 flex items-center justify-center"
                    aria-label="Choose difficulty"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </Dropdown>
              </div>
            </div>
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

      {/* Passage */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">Read this aloud</Title>
        <div className="text-sm leading-7 bg-neutral-50 rounded-xl p-3 min-h-[64px] max-h-[45vh] overflow-auto">
          {loadingText ? "Loading..." : text}
        </div>
      </Card>

      {/* Controls + transcript */}
      <Card className="rounded-2xl mb-3">
        {/* Responsive controls: stack on mobile, inline on md+ */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            type="primary"
            size="large"
            icon={<Mic className="w-4 h-4" />}
            onClick={handleRecord}
            loading={recording || loadingText}
            disabled={loadingText}
            className="rounded-xl w-full sm:w-auto"
          >
            {recording ? "Listening..." : "Start"}
          </Button>

          {!running ? (
            <Button onClick={start} className="rounded-xl">Resume</Button>
          ) : (
            <Button onClick={pause} className="rounded-xl">Pause</Button>
          )}

          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={resetAll}
            disabled={!spoken && !result}
            className="rounded-xl"
          >
            Reset
          </Button>

          <Button onClick={finish} disabled={!result} className="rounded-xl">
            Finish
          </Button>
        </div>

        {spoken && (
          <div className="mt-3">
            <Text strong>Your reading (transcript):</Text>
            <div className="mt-1 text-sm leading-6 whitespace-pre-wrap bg-white rounded-xl p-3 border max-h-56 overflow-auto">
              {spoken}
            </div>
          </div>
        )}
      </Card>

      {/* Feedback / diff */}
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

          {/* Safe wrapping + scrolling for long diffs */}
          <div className="mt-3 text-sm leading-7 bg-white rounded-xl p-3 border whitespace-pre-wrap break-words hyphens-auto max-h-72 overflow-auto">
            {result.tokens.map((t, i) => {
              const base = "align-baseline rounded px-0.5 py-[1px]";
              if (t.type === "missing") {
                return (
                  <span key={i} className={`${base} bg-red-200/90`} data-token-type="missing">
                    {t.text}
                  </span>
                );
              }
              if (t.type === "mismatch") {
                return (
                  <span key={i} className={`${base} bg-amber-200`} data-token-type="mismatch">
                    {t.text}
                  </span>
                );
              }
              return (
                <span key={i} className="align-baseline" data-token-type="ok">
                  {t.text}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* Reserve space so the footer chat never overlaps content */}
    </div>
  );
}
