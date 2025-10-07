// src/pages/student/reading/ReadAloudFlow.jsx
import { useState, useRef, useEffect } from "react";
import { Card, Typography, Button, Alert, Row, Col, message } from "antd";
import { Mic, Camera, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat"; // keeps content above chat footer

import { ocrImage, sttCaptureMock } from "@/api/reading.js";
import { diffTranscript } from "@/utils/diffTranscript.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;

export default function ReadAloudFlow() {
  const navigate = useNavigate();

  const [imgFile, setImgFile] = useState(null);
  const [expected, setExpected] = useState("");
  const [spoken, setSpoken] = useState("");
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);

  const flushedRef = useRef(false);
  const cameraCaptureRef = useRef(null);

  const { running, elapsedMs, start, pause, reset, flush } = useTaskTimer(
    "reading:read_aloud",
    { mode: "read_aloud" },
    true
  );

  // flush if user leaves midway
  useEffect(() => {
    return () => {
      if (!flushedRef.current) {
        flush("abandoned", { hadPhoto: !!imgFile });
        flushedRef.current = true;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgFile]);

  const handleOCR = async (file) => {
    if (!file) return;
    setImgFile(file);
    setLoadingOCR(true);
    try {
      const text = await ocrImage(file);
      setExpected(text || "");
      message.success("Text detected! You can start reading.");
    } catch {
      message.error("Could not read the image, try again.");
    } finally {
      setLoadingOCR(false);
    }
  };

  const handleRecord = async () => {
    setRecording(true);
    const transcript = await sttCaptureMock();
    setSpoken(transcript || "");
    setRecording(false);
    if (expected) {
      setResult(diffTranscript(expected, transcript || ""));
    } else {
      setResult(null);
    }
  };

  const resetAll = () => {
    setImgFile(null);
    setExpected("");
    setSpoken("");
    setResult(null);
    reset();
  };

  const finish = () => {
    const score = result?.score ?? 0;
    flush("completed", { accuracy: score, elapsedMs });
    flushedRef.current = true;
    pause();
    message.success("Nice reading! Saved your time & accuracy.");
  };

  // HH:MM:SS
  const hhmmss = new Date(elapsedMs).toISOString().substr(11, 8);

  return (
    // Scrollable in all views; works inside DeviceFrame on desktop too
    <div className="relative px-3 md:px-6 py-4 mx-auto w-full max-w-5xl min-h-[100svh] md:min-h-0 md:h-full lg:h-full overflow-y-auto">
      {/* Header with Back + GreetingBanner + Timer */}
      <div className="flex items-center gap-3 pt-6 mb-4">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1">
          <GreetingBanner
            title="Read Aloud"
            subtitle="Snap or upload text, then read it out loud."
            className="!bg-white"
            translucent={false}
          />
        </div>
        <div className="text-xs text-neutral-500 whitespace-nowrap">⏱ {hhmmss}</div>
      </div>

      {/* Coach intro */}
      <Card className="rounded-2xl mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-xl">🤖</div>
          <div className="flex-1">
            <Title level={5} className="!mb-1">Choose your text</Title>
            <Text type="secondary">
              Optional: take a photo of the text first. Then press the microphone and read it aloud.
            </Text>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left – Photo & Detected text */}
        <Col xs={24} md={12}>
          <Card className="rounded-2xl h-full">
            <Title level={5}>1) Photo (optional)</Title>

            {/* Direct camera capture (mobile-friendly) */}
            <div className="mt-2">
              <input
                ref={cameraCaptureRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleOCR(e.target.files?.[0])}
              />
              <Button
                onClick={() => cameraCaptureRef.current?.click()}
                icon={<Camera className="w-4 h-4" />}
                className="rounded-xl"
                disabled={loadingOCR}
                aria-busy={loadingOCR}
              >
                Take Photo
              </Button>
            </div>

            {expected && (
              // Limit height so long OCR text doesn't push the layout; allow inner scroll
              <div className="mt-3 p-3 rounded-xl bg-neutral-50 max-h-64 overflow-auto">
                <Text strong>Detected text:</Text>
                <div className="mt-1 text-sm leading-6 whitespace-pre-wrap">{expected}</div>
              </div>
            )}
          </Card>
        </Col>

        {/* Right – Read aloud & controls */}
        <Col xs={24} md={12}>
          <Card className="rounded-2xl h-full">
            <Title level={5}>2) Read it aloud</Title>

            {/* Responsive controls: stack on mobile, inline on md+ */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                type="primary"
                size="large"
                icon={<Mic className="w-4 h-4" />}
                loading={recording}
                onClick={handleRecord}
                className="rounded-xl w-full sm:w-auto"
                aria-busy={recording}
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
                className="rounded-xl"
              >
                Reset
              </Button>

              <Button onClick={finish} disabled={!result} className="rounded-xl">
                Finish
              </Button>
            </div>

            {spoken && (
              // Limit height for transcript, with its own scroll
              <div className="mt-3 p-3 rounded-xl bg-neutral-50 max-h-56 overflow-auto">
                <Text strong>Your reading (transcript):</Text>
                <div className="mt-1 text-sm leading-6 whitespace-pre-wrap">{spoken}</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Coach feedback */}
      {result && (
        <Card className="rounded-2xl mt-4">
          <Title level={5}>3) Coach feedback</Title>
          {result.score >= 0.9 ? (
            <Alert
              type="success"
              message="You read most of that perfectly! ⭐"
              description="Fantastic focus! Want to try a tiny challenge?"
              showIcon
              className="rounded-xl"
            />
          ) : (
            <Alert
              type="warning"
              message="Nice try! We found a few tricky spots."
              description="You skipped or changed a couple of words — want to try again?"
              showIcon
              className="rounded-xl"
            />
          )}

          {/* Diff block: wraps safely and scrolls if long */}
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

          <div className="mt-2 text-xs text-neutral-600">
            <b>Legend:</b>{" "}
            <mark className="bg-red-200">missing</mark> ·{" "}
            <span className="bg-amber-200 px-1 rounded">mispronounced / changed</span>
          </div>
        </Card>
      )}

      {/* Reserve space so the footer chat never overlaps content */}
      <ChatStripSpacer />
    </div>
  );
}
