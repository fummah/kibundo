// src/pages/admin/academics/ocr/OCRWorkspace.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Popconfirm,
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
  RedoOutlined,
  ClearOutlined,
  StopOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const LS_HISTORY_KEY = "kibundo_ocr_history";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // Increased to 50MB to match server config
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

export default function OCRWorkspace() {
  const { t } = useTranslation();
  // UI State
  const [uploading, setUploading] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, text: "", title: "" });
  const [fileList, setFileList] = useState([]);
  const [tags, setTags] = useState([]);
  const [inputTag, setInputTag] = useState("");

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
      const current = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
      const next = [item, ...current].slice(0, 50);
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(next));
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
        const local = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
        setHistory(local);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
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

  const baseFilename = useMemo(() => {
    const raw = result?.meta?.filename || "ocr-result";
    return raw.replace(/\.[^.]+$/, ""); // strip extension
  }, [result]);

  const downloadText = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseFilename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result ?? {}, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseFilename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------- Upload ------
  const beforeUpload = (file) => {
    // Reset file list to ensure only one file is uploaded at a time
    setFileList([file]);
    
    // Check file size
    if (file.size > MAX_FILE_BYTES) {
      const maxSizeMB = MAX_FILE_BYTES / (1024 * 1024);
      message.error({
        content: `File "${file.name}" is too large. Maximum file size is ${maxSizeMB}MB.`,
        duration: 5,
      });
      return Upload.LIST_IGNORE;
    }
    
    // Check file type
    if (!ACCEPTED_MIME.includes(file.type) && 
        !file.type.startsWith("image/") && 
        file.type !== "application/pdf") {
      message.warning({
        content: `Unsupported file type (${file.type}). Please upload JPG, PNG, HEIC, or PDF files.`,
        duration: 5,
      });
      return Upload.LIST_IGNORE;
    }
    
    // Show upload starting message
    message.info({
      content: `Processing ${file.name}...`,
      key: 'upload-status',
      duration: 3,
    });
    
    return true;
  };

  const handleTagClose = (removedTag) => {
    setTags(tags.filter(tag => tag !== removedTag));
  };

  const handleTagAdd = () => {
    if (inputTag && !tags.includes(inputTag)) {
      setTags([...tags, inputTag]);
      setInputTag('');
    }
  };

  const customRequest = async ({ file, onProgress, onSuccess, onError }) => {
    setUploading(true);
    setProgress(0);
    setResult(null);
    setTags([]); // Reset tags for new upload

    const controller = new AbortController();
    setAbortCtrl(controller);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("lang", lang);
      form.append("subject", subject ?? "");
      form.append("grade", grade ?? "");
      form.append("tags", JSON.stringify(tags)); // Send tags to backend
      form.append("deskew", String(deskew));
      form.append("denoise", String(denoise));
      form.append("enhanceContrast", String(enhanceContrast));

      const { data } = await api.post("/api/ocr/scan", form, {
        withCredentials: true,
        headers: { 
          "Content-Type": "multipart/form-data",
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: controller.signal,
        timeout: 300000, // 5 minutes timeout
        maxContentLength: MAX_FILE_BYTES,
        maxBodyLength: MAX_FILE_BYTES,
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
          onProgress?.({ percent: pct });
          
          // Update the status message with progress
          if (pct < 100) {
            message.loading({
              content: `Uploading ${file.name}: ${pct}%`,
              key: 'upload-status',
              duration: 0,
            });
          }
        },
      }).catch(error => {
        if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
          throw new Error('Upload timed out. The server took too long to respond. Please try a smaller file or check your internet connection.');
        } else if (error.response?.status === 413) {
          const maxSizeMB = MAX_FILE_BYTES / (1024 * 1024);
          throw new Error(`File too large. The server rejected the file because it exceeds the maximum allowed size of ${maxSizeMB}MB.`);
        } else if (error.response?.status === 415) {
          throw new Error('Unsupported file type. The server cannot process this file format.');
        } else if (error.response?.status >= 500) {
          throw new Error('Server error. Please try again later or contact support if the problem persists.');
        }
        throw new Error(error.response?.data?.message || error.message || 'An unknown error occurred');
      });

      const shaped = {
        id: data?.id ?? Date.now(),
        text: data?.text ?? "",
        confidence: data?.confidence ?? null,
        blocks: data?.blocks ?? [],
        tags: data?.tags ?? tags, // Include tags from response or use local tags
        meta: {
          filename: data?.meta?.filename ?? file.name,
          subject: data?.meta?.subject ?? subject ?? null,
          grade: data?.meta?.grade ?? grade ?? null,
          lang: data?.meta?.lang ?? lang,
          createdAt: data?.meta?.createdAt ?? new Date().toISOString(),
          fileSize: file.size,
          mimeType: file.type,
        },
      };

      setResult(shaped);
      pushHistoryLocal(shaped);
      
      // Show success message with file info
      message.success({
        content: `Successfully processed ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        duration: 5,
      });
      
      onSuccess?.(data);
      setActiveTab("result");
      setFileList([]); // Clear file list after successful upload
    } catch (err) {
      message.destroy('upload-status'); // Clear any existing upload status messages
      
      if (controller.signal.aborted) {
        message.info({
          content: "Upload was canceled by the user",
          duration: 3,
        });
      } else {
        const errorMsg = err?.response?.data?.message || err?.message || "OCR processing failed";
        
        // More user-friendly error messages
        let displayMsg = errorMsg;
        if (errorMsg.includes('413')) {
          const maxSizeMB = MAX_FILE_BYTES / (1024 * 1024);
          displayMsg = `File too large. Maximum file size is ${maxSizeMB}MB.`;
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          displayMsg = 'The operation timed out. Please try again with a smaller file or better network connection.';
        } else if (errorMsg.includes('network')) {
          displayMsg = 'Network error. Please check your internet connection and try again.';
        }
        
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Processing Failed</div>
              <div>{displayMsg}</div>
              {errorMsg !== displayMsg && (
                <div style={{ fontSize: '0.8em', opacity: 0.8, marginTop: 4 }}>
                  Error details: {errorMsg}
                </div>
              )}
            </div>
          ),
          duration: 8,
        });
        
        console.error('OCR Error:', err);
        onError?.(err);
      }
    } finally {
      setUploading(false);
      setAbortCtrl(null);
    }
  };

  const cancelUpload = () => {
    try {
      abortCtrl?.abort();
    } catch {}
  };

  // ------- Tag Display Component -------
  const TagDisplay = ({ tags }) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>Tags:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {tags && tags.length > 0 ? (
          tags.map((tag, index) => (
            <Tag key={index} color="blue" closable onClose={() => handleTagClose(tag)}>
              {tag}
            </Tag>
          ))
        ) : (
          <span style={{ color: 'rgba(0, 0, 0, 0.25)' }}>No tags added</span>
        )}
      </div>
    </div>
  );

  // ------- History Table -------
  const historyCols = [
    {
      title: "File",
      dataIndex: ["meta", "filename"],
      key: "filename",
      render: (v, record) => (
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontWeight: 500 }} className="truncate">{v}</div>
          {record.tags && record.tags.length > 0 && (
            <div className="truncate">
              {record.tags.slice(0, 2).map((tag, i) => (
                <Tag key={i} color="blue" size="small" style={{ marginTop: 4, marginRight: 4 }}>
                  {tag.length > 12 ? `${tag.substring(0, 10)}...` : tag}
                </Tag>
              ))}
              {record.tags.length > 2 && (
                <Tag size="small" style={{ marginTop: 4 }}>+{record.tags.length - 2} more</Tag>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Subject",
      dataIndex: ["meta", "subject"],
      key: "subject",
      render: (v) => (v ? <Tag color="blue">{v}</Tag> : <Tag>—</Tag>),
      filters: [
        { text: "Maths", value: "Maths" },
        { text: "English", value: "English" },
        { text: "Science", value: "Science" },
        { text: "Social Studies", value: "Social Studies" },
      ],
      onFilter: (value, record) => (record?.meta?.subject || "") === value,
    },
    {
      title: "Grade",
      dataIndex: ["meta", "grade"],
      key: "grade",
      render: (v) => (v ? <Tag color="purple">{v}</Tag> : <Tag>—</Tag>),
      filters: ["1", "2", "3", "4"].map((g) => ({ text: g, value: g })),
      onFilter: (value, record) => (record?.meta?.grade || "") === value,
    },
    {
      title: "Lang",
      dataIndex: ["meta", "lang"],
      key: "lang",
      width: 100,
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      width: 140,
      sorter: (a, b) => (a.confidence ?? -1) - (b.confidence ?? -1),
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
      width: 190,
      render: (v) => new Date(v).toLocaleString(),
      sorter: (a, b) =>
        new Date(a?.meta?.createdAt || 0) - new Date(b?.meta?.createdAt || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, row) => (
        <Space wrap>
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
          <Tooltip title="Re-run OCR with current options">
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={() => {
                setResult(row);
                setActiveTab("result");
                message.info("Re-run from original file not implemented yet");
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
                a.download = `${(row?.meta?.filename || "ocr").replace(/\.[^.]+$/, "")}.json`;
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
                const next = (history || []).filter((h) => h.id !== row.id);
                setHistory(next);
                localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(next));
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
          <UploadOutlined /> {t("common.upload")}
          {fileList.length > 0 && <Badge count={fileList.length} style={{ marginLeft: 8 }} />}
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <Card title={<Space><SettingOutlined /> {t("common.options")}</Space>} className="dark:bg-gray-800">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div>
                    <Text strong>{t("common.language")}</Text>
                    <Select
                      style={{ width: "100%", marginTop: 6 }}
                      value={lang}
                      onChange={setLang}
                      options={[
                        { value: "eng", label: "English (eng)" },
                        { value: "deu", label: "German (deu)" },
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
                  beforeUpload={beforeUpload}
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
                    Supports JPG, PNG, HEIC/HEIF, and PDF. Max ~10MB recommended.
                  </p>
                </Dragger>

                {uploading && (
                  <div className="mt-4">
                    <Progress percent={progress} />
                    <Space className="mt-2">
                      <Button icon={<StopOutlined />} danger onClick={cancelUpload}>
                        Cancel
                      </Button>
                    </Space>
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

                <div className="mt-2 text-xs text-gray-500">
                  {`${(result?.text || "").split(/\s+/).filter(Boolean).length} words · ${(result?.text || "").length} chars`}
                </div>
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
                          key={b?.id ?? idx}
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
          <Space className="mb-3" wrap>
           
          </Space>
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
