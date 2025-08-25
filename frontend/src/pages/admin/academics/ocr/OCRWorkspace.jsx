// src/pages/admin/academics/ocr/OCRWorkspace.jsx
import { useEffect, useRef, useState } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Space,
  Button,
  Upload,
  message,
  Tabs,
  Tag,
  Divider,
  Input,
  Select,
  Progress,
  Modal,
  Table,
  Tooltip,
  Empty,
  Badge,
} from "antd";
import {
  UploadOutlined,
  FileTextOutlined,
  ScanOutlined,
  CameraOutlined,
  ReloadOutlined,
  CopyOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function OCRWorkspace() {
  // UI State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, text: "", title: "" });

  // Options
  const [lang, setLang] = useState("eng");
  const [subject, setSubject] = useState(undefined);
  const [grade, setGrade] = useState(undefined);
  const [deskew, setDeskew] = useState(true);
  const [denoise, setDenoise] = useState(true);
  const [enhanceContrast, setEnhanceContrast] = useState(true);

  const textRef = useRef(null);

  // ------- Helpers -------
  const pushHistoryLocal = (item) => {
    try {
      const key = "kibundo_ocr_history";
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [item, ...current].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(next));
      setHistory(next);
    } catch {}
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      // Try server history first
      const { data } = await api.get("/api/ocr/history", { withCredentials: true });
      if (Array.isArray(data) && data.length) {
        setHistory(data);
      } else {
        // Fallback to local
        const local = JSON.parse(localStorage.getItem("kibundo_ocr_history") || "[]");
        setHistory(local);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem("kibundo_ocr_history") || "[]");
      setHistory(local);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(result?.text || "");
      message.success("Copied to clipboard");
    } catch {
      message.error("Copy failed");
    }
  };

  const downloadText = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = result?.meta?.filename || "ocr-result";
    a.download = `${base}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result ?? {}, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = result?.meta?.filename || "ocr-result";
    a.href = url;
    a.download = `${base}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------- Upload ------
  const customRequest = async ({ file, onProgress, onSuccess, onError }) => {
    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("lang", lang);
      form.append("subject", subject ?? "");
      form.append("grade", grade ?? "");
      form.append("deskew", String(deskew));
      form.append("denoise", String(denoise));
      form.append("enhanceContrast", String(enhanceContrast));

      const { data } = await api.post("/api/ocr/scan", form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
          onProgress?.({ percent: pct });
        },
      });

      const shaped = {
        id: data?.id ?? Date.now(),
        text: data?.text ?? "",
        confidence: data?.confidence ?? null,
        blocks: data?.blocks ?? [],
        meta: {
          filename: data?.meta?.filename ?? file.name,
          subject: data?.meta?.subject ?? subject ?? null,
          grade: data?.meta?.grade ?? grade ?? null,
          lang: data?.meta?.lang ?? lang,
          createdAt: data?.meta?.createdAt ?? new Date().toISOString(),
        },
      };

      setResult(shaped);
      pushHistoryLocal(shaped);
      message.success("OCR complete");
      onSuccess?.(data);
      setActiveTab("result");
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "OCR failed");
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  // ------- History Table -------
  const historyCols = [
    {
      title: "File",
      dataIndex: ["meta", "filename"],
      key: "filename",
      render: (v) => <Text ellipsis style={{ maxWidth: 220 }}>{v}</Text>,
    },
    {
      title: "Subject",
      dataIndex: ["meta", "subject"],
      key: "subject",
      render: (v) => (v ? <Tag color="blue">{v}</Tag> : <Tag>—</Tag>),
    },
    {
      title: "Grade",
      dataIndex: ["meta", "grade"],
      key: "grade",
      render: (v) => (v ? <Tag color="purple">{v}</Tag> : <Tag>—</Tag>),
    },
    {
      title: "Lang",
      dataIndex: ["meta", "lang"],
      key: "lang",
      width: 90,
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      width: 140,
      render: (v) =>
        v == null ? (
          <Tag>—</Tag>
        ) : (
          <Badge
            status={v >= 0.85 ? "success" : v >= 0.6 ? "warning" : "error"}
            text={`${Math.round(v * 100)}%`}
          />
        ),
    },
    {
      title: "Date",
      dataIndex: ["meta", "createdAt"],
      key: "date",
      width: 180,
      render: (v) => new Date(v).toLocaleString(),
      sorter: (a, b) =>
        new Date(a?.meta?.createdAt || 0) - new Date(b?.meta?.createdAt || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, row) => (
        <Space>
          <Tooltip title="View">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setResult(row);
                setActiveTab("result");
              }}
            />
          </Tooltip>
          <Tooltip title="Download JSON">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                const blob = new Blob([JSON.stringify(row, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${row?.meta?.filename || "ocr"}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </Tooltip>
          <Tooltip title="Remove (local)">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                const key = "kibundo_ocr_history";
                const next = (history || []).filter((h) => h.id !== row.id);
                setHistory(next);
                localStorage.setItem(key, JSON.stringify(next));
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabs = [
    {
      key: "upload",
      label: (
        <span>
          <UploadOutlined /> Upload
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <Card title={<Space><SettingOutlined /> Options</Space>} className="dark:bg-gray-800">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div>
                    <Text strong>Language</Text>
                    <Select
                      style={{ width: "100%", marginTop: 6 }}
                      value={lang}
                      onChange={setLang}
                      options={[
 { value: "deu", label: "German (deu)" },
 { value: "eng", label: "English (eng)" },
   { value: "fra", label: "French (fra)" },
  { value: "ita", label: "Italian (ita)" },
  { value: "spa", label: "Spanish (spa)" },
  { value: "nld", label: "Dutch (nld)" },
]}
                      showSearch
                    />
                  </div>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Text strong>Subject</Text>
                      <Select
                        style={{ width: "100%", marginTop: 6 }}
                        value={subject}
                        onChange={setSubject}
                        allowClear
                        placeholder="Optional"
                        options={[
                          { value: "Maths", label: "Maths" },
                          { value: "English", label: "English" },
                          { value: "Science", label: "Science" },
                          { value: "Social Studies", label: "Social Studies" },
                        ]}
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong>Grade</Text>
                      <Select
                        style={{ width: "100%", marginTop: 6 }}
                        value={grade}
                        onChange={setGrade}
                        allowClear
                        placeholder="Optional"
                        options={["1", "2", "3", "4"].map((g) => ({ value: g, label: `Grade ${g}` }))}
                      />
                    </Col>
                  </Row>

                  <Divider className="my-3" />

                  <Space wrap>
                    <Tag
                      color={deskew ? "green" : "default"}
                      onClick={() => setDeskew((v) => !v)}
                      style={{ cursor: "pointer" }}
                    >
                      Deskew: {deskew ? "On" : "Off"}
                    </Tag>
                    <Tag
                      color={denoise ? "green" : "default"}
                      onClick={() => setDenoise((v) => !v)}
                      style={{ cursor: "pointer" }}
                    >
                      Denoise: {denoise ? "On" : "Off"}
                    </Tag>
                    <Tag
                      color={enhanceContrast ? "green" : "default"}
                      onClick={() => setEnhanceContrast((v) => !v)}
                      style={{ cursor: "pointer" }}
                    >
                      Enhance Contrast: {enhanceContrast ? "On" : "Off"}
                    </Tag>
                  </Space>
                </Space>
              </Card>

              <Card className="mt-4 dark:bg-gray-800">
                <Space>
                  <CameraOutlined />
                  <Text>Camera capture (optional)</Text>
                </Space>
                <div className="mt-2">
                  <Button
                    icon={<CameraOutlined />}
                    onClick={() => message.info("Camera capture coming soon")}
                  >
                    Open Camera
                  </Button>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={14}>
              <Card
                title={
                  <Space>
                    <UploadOutlined /> Upload Image or PDF
                  </Space>
                }
                className="dark:bg-gray-800"
              >
                <Dragger
                  name="file"
                  multiple={false}
                  showUploadList={false}
                  accept="image/*,.pdf"
                  customRequest={customRequest}
                  disabled={uploading}
                  style={{ padding: 16 }}
                >
                  <p className="ant-upload-drag-icon">
                    <ScanOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to this area to start OCR
                  </p>
                  <p className="ant-upload-hint">
                    Supports JPG, PNG, HEIC, and PDF. Max ~10MB recommended.
                  </p>
                </Dragger>

                {uploading && (
                  <div className="mt-4">
                    <Progress percent={progress} />
                    <Text type="secondary">Processing…</Text>
                  </div>
                )}

                <div className="mt-4 text-right">
                  <Button icon={<ReloadOutlined />} onClick={() => setResult(null)} disabled={uploading}>
                    Reset
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: "result",
      label: (
        <span>
          <FileTextOutlined /> Result
        </span>
      ),
      children: !result ? (
        <Empty description="No result yet. Upload a file to begin." />
      ) : (
        <>
          <Card className="dark:bg-gray-800">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Space align="center" className="mb-2" wrap>
                  <Tag color="blue">{result?.meta?.filename}</Tag>
                  {result?.meta?.subject && <Tag color="geekblue">{result.meta.subject}</Tag>}
                  {result?.meta?.grade && <Tag color="purple">Grade {result.meta.grade}</Tag>}
                  {result?.confidence != null && (
                    <Tag color={result.confidence >= 0.85 ? "green" : result.confidence >= 0.6 ? "gold" : "red"}>
                      Confidence: {Math.round(result.confidence * 100)}%
                    </Tag>
                  )}
                </Space>

                <Input.TextArea
                  ref={textRef}
                  value={result.text || ""}
                  rows={18}
                  onChange={(e) => setResult((r) => ({ ...r, text: e.target.value }))}
                />

                <Space className="mt-3" wrap>
                  <Button icon={<CopyOutlined />} onClick={copyText}>
                    Copy
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={downloadText}>
                    Download .txt
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={downloadJSON}>
                    Download .json
                  </Button>
                </Space>
              </Col>

              <Col xs={24} md={8}>
                <Card size="small" title="Metadata" className="dark:bg-gray-800">
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">Language:</Text>
                    <Text>{result?.meta?.lang}</Text>
                    <Divider className="my-2" />
                    <Text type="secondary">Created:</Text>
                    <Text>{new Date(result?.meta?.createdAt || Date.now()).toLocaleString()}</Text>
                  </Space>
                </Card>

                <Card size="small" title="Blocks" className="mt-3 dark:bg-gray-800">
                  {Array.isArray(result?.blocks) && result.blocks.length ? (
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {result.blocks.slice(0, 10).map((b, idx) => (
                        <Card
                          key={idx}
                          size="small"
                          type="inner"
                          title={b?.type || `Block ${idx + 1}`}
                          extra={
                            b?.confidence != null ? `${Math.round(b.confidence * 100)}%` : undefined
                          }
                        >
                          <Text>{b?.text || ""}</Text>
                        </Card>
                      ))}
                      {result.blocks.length > 10 && (
                        <Button
                          type="link"
                          onClick={() =>
                            setPreviewModal({
                              open: true,
                              title: "All Blocks (JSON)",
                              text: JSON.stringify(result.blocks, null, 2),
                            })
                          }
                        >
                          View all…
                        </Button>
                      )}
                    </Space>
                  ) : (
                    <Empty description="No block details" />
                  )}
                </Card>
              </Col>
            </Row>
          </Card>
        </>
      ),
    },
    {
      key: "history",
      label: (
        <span>
          <HistoryOutlined /> History
        </span>
      ),
      children: (
        <Card className="dark:bg-gray-800">
          <Table
            loading={historyLoading}
            dataSource={history}
            columns={historyCols}
            rowKey={(row) => row.id}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-white dark:bg-gray-900">
      <Space align="center" className="mb-3">
        <Title level={2} style={{ margin: 0 }}>
          🔎 OCR Workspace
        </Title>
        <Tag color="processing">Beta</Tag>
      </Space>
      <Text type="secondary">
        Upload a worksheet or photo. We’ll extract the text and keep a scan history.
      </Text>

      <Card className="mt-4 dark:bg-gray-800">
        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
      </Card>

      <Modal
        title={previewModal.title}
        open={previewModal.open}
        footer={<Button onClick={() => setPreviewModal({ open: false, text: "", title: "" })}>Close</Button>}
        onCancel={() => setPreviewModal({ open: false, text: "", title: "" })}
        width={800}
      >
        <pre className="whitespace-pre-wrap text-sm">{previewModal.text}</pre>
      </Modal>
    </div>
  );
}
