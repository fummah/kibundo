import { useState } from "react";
import { Card, Typography, Upload, Button, Space, Alert, message } from "antd";
import { Mic, Camera, RefreshCw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ocrImage, sttCaptureMock } from "@/api/reading.js";
import { diffTranscript } from "@/utils/diffTranscript.js";

const { Title, Text } = Typography;

export default function ReadAloudFlow() {
  const navigate = useNavigate();
  const [imgFile, setImgFile] = useState(null);
  const [expected, setExpected] = useState("");
  const [spoken, setSpoken] = useState("");
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);

  const handleOCR = async (file) => {
    setImgFile(file);
    setLoadingOCR(true);
    try {
      const text = await ocrImage(file);
      setExpected(text);
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
    setSpoken(transcript);
    setRecording(false);
    if (expected) setResult(diffTranscript(expected, transcript));
  };

  const resetAll = () => { setImgFile(null); setExpected(""); setSpoken(""); setResult(null); };

  return (
    <div className="px-3 md:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">Read Aloud</Title>
      </div>

      <Card className="rounded-2xl mb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-xl">🤖</div>
          <div className="flex-1">
            <Title level={5} className="!mb-1">Choose your text</Title>
            <Text type="secondary">Optional: take a photo of the text first. Then press the microphone and read it aloud.</Text>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl mb-3">
        <Title level={5}>1) Photo (optional)</Title>
        <Upload.Dragger
          accept="image/*"
          beforeUpload={(file) => { handleOCR(file); return false; }}
          showUploadList={!!imgFile}
          disabled={loadingOCR}
          className="!rounded-xl"
        >
          <p className="ant-upload-drag-icon"><Camera /></p>
          <p className="ant-upload-text">Tap to take a photo / upload</p>
        </Upload.Dragger>
        {expected && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-50">
            <Text strong>Detected text:</Text>
            <div className="mt-1 text-sm leading-6 whitespace-pre-wrap">{expected}</div>
          </div>
        )}
      </Card>

      <Card className="rounded-2xl mb-3">
        <Title level={5}>2) Read it aloud</Title>
        <Space>
          <Button type="primary" size="large" icon={<Mic className="w-4 h-4" />} loading={recording} onClick={handleRecord} className="rounded-xl">
            {recording ? "Listening..." : "Start Microphone"}
          </Button>
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={resetAll} className="rounded-xl">Reset</Button>
        </Space>
        {spoken && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-50">
            <Text strong>Your reading (transcript):</Text>
            <div className="mt-1 text-sm leading-6 whitespace-pre-wrap">{spoken}</div>
          </div>
        )}
      </Card>

      {result && (
        <Card className="rounded-2xl">
          <Title level={5}>3) Coach feedback</Title>
          {result.score >= 0.9 ? (
            <Alert type="success" message="You read most of that perfectly! ⭐" description="Fantastic focus! Want to try a tiny challenge?" showIcon className="rounded-xl" />
          ) : (
            <Alert type="warning" message="Nice try! We found a few tricky spots." description="You skipped or changed a couple of words — want to try again?" showIcon className="rounded-xl" />
          )}
          <div className="mt-3 text-sm leading-7 bg-white rounded-xl p-3 border">
            {result.tokens.map((t, i) => {
              if (t.type === "missing") return <mark key={i} className="bg-red-200">{t.text}</mark>;
              if (t.type === "mismatch") return <span key={i} className="bg-amber-200 px-1 rounded">{t.text}</span>;
              return <span key={i}>{t.text}</span>;
            })}
          </div>
          <div className="mt-2 text-xs text-neutral-600">
            <b>Legend:</b> <mark className="bg-red-200">missing</mark> · <span className="bg-amber-200 px-1 rounded">mispronounced / changed</span>
          </div>
        </Card>
      )}
    </div>
  );
}
