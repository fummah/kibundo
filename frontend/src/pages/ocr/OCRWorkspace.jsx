// src/pages/ocr/OCRWorkspace.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Col, Form, Input, Modal, Progress, Row, Select, Space,
  Typography, Upload, message, InputNumber
} from "antd";
import {
  InboxOutlined, PlayCircleOutlined, CopyOutlined, SaveOutlined,
  FileTextOutlined, ExportOutlined
} from "@ant-design/icons";

const { Dragger } = Upload;
const { TextArea } = Input;

const defaultText = "Detected text will appear here after OCR runs…";

function fileBaseWithoutExt(name = "") {
  return name.replace(/\.[^.]+$/g, "");
}

export default function OCRWorkspace({
  defaultLanguage = "de",     // ✅ prefer German by default
  onComplete,                 // (payload) => void
  onClose,                    // optional: parent Drawer can pass this
}) {
  const [form] = Form.useForm();

  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState(null);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState(defaultText);

  const [ocrLang, setOcrLang] = useState(defaultLanguage);
  const [engine, setEngine] = useState("tesseract");

  const isPdf = (fileName || "").toLowerCase().endsWith(".pdf");

  const uploadProps = useMemo(
    () => ({
      multiple: false,
      accept: ".png,.jpg,.jpeg,.pdf",
      beforeUpload: (file) => {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setFileName(file.name);
        setText(defaultText);
        setProgress(0);
        message.success(`Loaded ${file.name}`);
        // Prefill worksheetId from file name if empty
        const base = fileBaseWithoutExt(file.name);
        if (!form.getFieldValue("worksheetId")) {
          form.setFieldsValue({ worksheetId: base });
        }
        return false; // prevent auto upload
      },
    }),
    [form]
  );

  const simulateOCR = async () => {
    if (!fileUrl) return message.warning("Please add a scan or PDF first.");
    setRunning(true);
    setText(defaultText);
    for (let p = 0; p <= 100; p += 10) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
      setProgress(p);
    }
    // demo text
    setText(
      `Student: A. Moyo
Subject: Mathematics
Score: 18/20

1) 6 + 7 = 13
2) 12 - 4 = 8
3) 3 × 5 = 15`
    );
    setRunning(false);
    message.success("OCR complete (demo)");
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text || "");
    message.success("Extracted text copied");
  };

  const exportJSON = () => {
    const payload = {
      text,
      fileName,
      language: ocrLang,
      engine,
      meta: form.getFieldsValue(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveAndSend = async () => {
    if (!fileName) {
      message.warning("Please add a scan or PDF first.");
      return;
    }
    const vals = await form.validateFields();
    const payload = {
      // Required by ScansOverview onComplete
      student: vals.student || "—",
      class: vals.classGrade || vals.grade || "—",
      state: vals.state || "—",
      school: vals.school || "—",

      fileName,
      description: vals.description || "",
      publisher: vals.publisher || "",
      timeToCompleteMins:
        vals.timeToCompleteMins !== undefined && vals.timeToCompleteMins !== null
          ? Number(vals.timeToCompleteMins)
          : null,
      avgAttempts:
        vals.avgAttempts !== undefined && vals.avgAttempts !== null
          ? Number(vals.avgAttempts)
          : null,

      language: ocrLang, // "de" or "en"
      engine,
      worksheetId: vals.worksheetId || fileBaseWithoutExt(fileName),

      // Optional raw text
      text,
    };

    onComplete?.(payload);
  };

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Typography.Title level={3} className="!mb-0">
        OCR Workspace
      </Typography.Title>

      <Row gutter={16}>
        {/* LEFT: Upload & Preview */}
        <Col xs={24} md={12}>
          <Card title="Upload / Preview" className="rounded-xl">
            <Dragger {...uploadProps} className="!p-6">
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag image/PDF here</p>
              <p className="ant-upload-hint">Accepted: PNG, JPG, JPEG, PDF</p>
            </Dragger>

            {fileUrl && (
              <div className="mt-4 border rounded overflow-hidden h-[420px] flex items-center justify-center bg-gray-50">
                {isPdf ? (
                  <iframe title="preview" src={fileUrl} className="w-full h-full" />
                ) : (
                  <img alt="preview" src={fileUrl} className="max-h-full object-contain" />
                )}
              </div>
            )}

            <Space className="mt-4" wrap>
              <Select
                value={ocrLang}
                onChange={setOcrLang}
                options={[
                  { value: "de", label: "German" },   // ✅ German added
                  { value: "en", label: "English" },
                ]}
                style={{ width: 180 }}
              />
              <Select
                value={engine}
                onChange={setEngine}
                options={[
                  { value: "tesseract", label: "Tesseract (local)" },
                  { value: "cloud", label: "Cloud OCR (API)" },
                ]}
                style={{ width: 220 }}
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={running}
                onClick={simulateOCR}
              >
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
            title={
              <span className="flex items-center gap-2">
                <FileTextOutlined /> Extracted Text
              </span>
            }
            extra={
              <Space>
                <Button icon={<CopyOutlined />} onClick={copyText}>
                  Copy
                </Button>
                <Button icon={<ExportOutlined />} onClick={exportJSON}>
                  Export JSON
                </Button>
              </Space>
            }
            className="rounded-xl"
          >
            <TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoSize={{ minRows: 12, maxRows: 18 }}
            />
          </Card>

          <Card className="mt-4 rounded-xl" title="Metadata / Validation">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                // sensible defaults
                publisher: "Kibundo",
                timeToCompleteMins: null,
                avgAttempts: null,
                worksheetId: fileBaseWithoutExt(fileName || ""),
              }}
            >
              <Form.Item name="student" label="Student">
                <Input placeholder="Match to a student…" />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="classGrade" label="Class / Grade">
                    <Input placeholder="e.g., Grade 4" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="state" label="State">
                    <Input placeholder="e.g., BW" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="school" label="School">
                    <Input placeholder="School name…" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="publisher" label="Publisher tag">
                    <Input placeholder="Kibundo / OpenEd / …" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="timeToCompleteMins" label="Time to complete (mins)">
                    <InputNumber min={0} style={{ width: "100%" }} placeholder="e.g., 18" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="avgAttempts" label="Average attempts">
                    <InputNumber min={0} step={0.1} style={{ width: "100%" }} placeholder="e.g., 1.4" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="worksheetId" label="Worksheet ID (optional)">
                <Input placeholder="Used to detect matches; defaults to file name" />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <TextArea rows={3} placeholder="Short context for this scan…" />
              </Form.Item>

              <Space>
                <Button type="primary" icon={<SaveOutlined />} onClick={saveAndSend}>
                  Save
                </Button>
                {onClose && <Button onClick={onClose}>Close</Button>}
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>

      <ApiNote />
    </Space>
  );
}

function ApiNote() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="link" onClick={() => setOpen(true)}>
        How to wire real OCR?
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        title="Integration Hints"
      >
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Replace <b>simulateOCR()</b> with a call to your OCR service (Tesseract.js or server API).
          </li>
          <li>Persist results via your backend and refresh the Scans table.</li>
          <li>
            Populate <code>worksheetId</code> from your backend if you want precise match grouping.
          </li>
        </ol>
      </Modal>
    </>
  );
}
