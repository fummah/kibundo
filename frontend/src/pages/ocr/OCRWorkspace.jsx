import React, { useMemo, useState } from "react";
import {
  Button, Card, Col, Form, Input, Modal, Progress, Row, Select, Space, Typography, Upload, message
} from "antd";
import { InboxOutlined, PlayCircleOutlined, CopyOutlined, SaveOutlined, FileTextOutlined, ExportOutlined } from "@ant-design/icons";

const { Dragger } = Upload;
const defaultText = "Detected text will appear here after OCR runs…";

export default function OCRWorkspace() {
  const [fileUrl, setFileUrl] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState(defaultText);

  const uploadProps = useMemo(() => ({
    multiple: false,
    accept: ".png,.jpg,.jpeg,.pdf",
    beforeUpload: (file) => {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setText(defaultText);
      setProgress(0);
      message.success(`Loaded ${file.name}`);
      return false; // prevent auto upload
    },
  }), []);

  const simulateOCR = async () => {
    if (!fileUrl) return message.warning("Please add a scan or PDF first.");
    setRunning(true);
    setText(defaultText);
    for (let p = 0; p <= 100; p += 10) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 200));
      setProgress(p);
    }
    setText(`Student: A. Moyo\nSubject: Mathematics\nScore: 18/20\n\n1) 6 + 7 = 13\n2) 12 - 4 = 8\n3) 3 × 5 = 15`);
    setRunning(false);
    message.success("OCR complete (demo)");
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    message.success("Extracted text copied");
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ text }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ocr-result.json"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Typography.Title level={3} className="!mb-0">OCR Workspace</Typography.Title>

      <Row gutter={16}>
        {/* LEFT: Upload & Preview */}
        <Col xs={24} md={12}>
          <Card title="Upload / Preview">
            <Dragger {...uploadProps} className="!p-6">
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag image/PDF here</p>
              <p className="ant-upload-hint">Accepted: PNG, JPG, JPEG, PDF</p>
            </Dragger>

            {fileUrl && (
              <div className="mt-4 border rounded overflow-hidden h-[420px] flex items-center justify-center bg-gray-50">
                {fileUrl.endsWith(".pdf") ? (
                  <iframe title="preview" src={fileUrl} className="w-full h-full" />
                ) : (
                  <img alt="preview" src={fileUrl} className="max-h-full object-contain" />
                )}
              </div>
            )}

            <Space className="mt-4" wrap>
              <Select
                defaultValue="eng"
                options={[
                  { value: "eng", label: "English" },
                  { value: "afr", label: "Afrikaans" },
                  { value: "zul", label: "Zulu" },
                ]}
                style={{ width: 180 }}
              />
              <Select
                defaultValue="tesseract"
                options={[
                  { value: "tesseract", label: "Tesseract (local)" },
                  { value: "cloud", label: "Cloud OCR (API)" },
                ]}
                style={{ width: 220 }}
              />
              <Button type="primary" icon={<PlayCircleOutlined />} loading={running} onClick={simulateOCR}>
                Run OCR
              </Button>
            </Space>

            {running || progress > 0 ? (
              <div className="mt-4">
                <Progress percent={progress} status={running ? "active" : "normal"} />
              </div>
            ) : null}
          </Card>
        </Col>

        {/* RIGHT: Extraction & Metadata */}
        <Col xs={24} md={12}>
          <Card
            title={<span className="flex items-center gap-2"><FileTextOutlined /> Extracted Text</span>}
            extra={
              <Space>
                <Button icon={<CopyOutlined />} onClick={copyText}>Copy</Button>
                <Button icon={<ExportOutlined />} onClick={exportJSON}>Export JSON</Button>
              </Space>
            }
          >
            <Input.TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoSize={{ minRows: 12, maxRows: 18 }}
            />
          </Card>

          <Card className="mt-4" title="Metadata / Validation">
            <Form layout="vertical">
              <Form.Item label="Student">
                <Input placeholder="Match to a student…" />
              </Form.Item>
              <Form.Item label="Subject">
                <Select
                  showSearch
                  placeholder="Select subject"
                  options={[
                    { value: "Mathematics", label: "Mathematics" },
                    { value: "English", label: "English" },
                    { value: "Science", label: "Science" },
                  ]}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Date Submitted"><Input placeholder="YYYY-MM-DD" /></Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Score (optional)"><Input placeholder="e.g., 18/20" /></Form.Item>
                </Col>
              </Row>
              <Space>
                <Button type="primary" icon={<SaveOutlined />}>Save</Button>
                <Button>Attach to Assignment</Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Small helper modal for API wiring info */}
      <ApiNote />
    </Space>
  );
}

function ApiNote() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="link" onClick={() => setOpen(true)}>How to wire real OCR?</Button>
      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => setOpen(false)} title="Integration Hints">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Replace <b>simulateOCR()</b> with a call to your OCR service (Tesseract.js or server API).</li>
          <li>Persist results via your backend and update Scans list.</li>
          <li>Use query params like <code>?id=123</code> to fetch a specific scan for reprocessing.</li>
        </ol>
      </Modal>
    </>
  );
}
