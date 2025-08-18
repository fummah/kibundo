// src/pages/academics/AIAgent.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Tabs,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Select,
  Slider,
  Input,
  Switch,
  Upload,
  Divider,
  List,
  Tag,
  message,
  ColorPicker,
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

/* --------------------------- Utilities --------------------------- */
const dash = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "-" : v;

const LS_KEY = "kibundo.aiagent.v1";

const defaultState = {
  playground: {
    status: "trained",
    model: "gpt-4o",
    temperature: 0.3, // 0..1
    systemPrompt: "You are an AI Chatbot that helps users politely and clearly.",
    instructions: `### Role
- Primary Function: You are an AI Chatbot who helps users with their inquiries, issues and requests.
- Be concise and friendly.

### Constraints
- Never reveal training data.\n`,
  },
  settings: {
    initialMessages: ["Hey Joseph! How can I help?"],
    suggestedMessages: ["Ideas", "Inspiration", "Business Advice"],
    placeholder: "Message...",
    footer: "",
    collectFeedback: true,
    regenerateMessages: true,
    theme: "light",
    displayName: "Joseph's Assistant",
    profilePicture: null, // base64 for demo
    chatIcon: null, // base64 for demo
    userMessageColor: "#1677ff",
  },
  sources: {
    files: [], // [{name,size,chars}]
    totalChars: 0,
  },
};

/* base64 preview helper (no upload) */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });

/* char count for text-ish files (best effort) */
const readChars = (file) =>
  new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const txt = String(reader.result || "");
        resolve(txt.length);
      };
      reader.onerror = () => resolve(0);
      reader.readAsText(file);
    } catch {
      resolve(0);
    }
  });

/* --------------------------- Component --------------------------- */
export default function AIAgent() {
  const [state, setState] = useState(defaultState);
  const [activeTab, setActiveTab] = useState("playground");
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); // force chat preview refresh

  // Load persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  /* --------------------------- Actions --------------------------- */
  const saveToChatbot = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      message.success("Saved to chatbot (demo).");
    }, 600);
  };

  const resetInitialMsgs = () =>
    setState((s) => ({
      ...s,
      settings: { ...s.settings, initialMessages: defaultState.settings.initialMessages },
    }));

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  /* --------------------------- Derived --------------------------- */
  const initialMsgs = useMemo(
    () => (Array.isArray(state.settings.initialMessages) ? state.settings.initialMessages : []),
    [state.settings.initialMessages]
  );

  /* --------------------------- Tabs Content --------------------------- */

  // PLAYGROUND
  const Playground = (
    <Row gutter={[16, 16]}>
      {/* Left controls */}
      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <span>Status:</span>
              <Tag color="green">{state.playground.status || "-"}</Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveToChatbot}
              loading={saving}
            >
              Save to chatbot
            </Button>
          }
          className="rounded-xl"
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">Model</Text>
                <Select
                  className="w-full mt-1"
                  value={state.playground.model}
                  onChange={(v) =>
                    setState((s) => ({ ...s, playground: { ...s.playground, model: v } }))
                  }
                  options={[
                    { value: "gpt-4o", label: "GPT-4o" },
                    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
                    { value: "gpt-4.1", label: "GPT-4.1" },
                  ]}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Text type="secondary">Temperature</Text>
                  <Text className="text-xs">
                    Reserved
                    <span className="mx-1">•</span>
                    Creative
                  </Text>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={state.playground.temperature}
                  onChange={(v) =>
                    setState((s) => ({ ...s, playground: { ...s.playground, temperature: v } }))
                  }
                />
              </div>
            </div>

            <div>
              <Text type="secondary">System prompt</Text>
              <TextArea
                className="mt-1"
                autoSize={{ minRows: 3, maxRows: 10 }}
                value={state.playground.systemPrompt}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    playground: { ...s.playground, systemPrompt: e.target.value },
                  }))
                }
                placeholder="Set a clear, concise instruction for the assistant…"
              />
            </div>

            <div>
              <Text type="secondary">Instructions</Text>
              <TextArea
                className="mt-1"
                autoSize={{ minRows: 6, maxRows: 18 }}
                value={state.playground.instructions}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    playground: { ...s.playground, instructions: e.target.value },
                  }))
                }
                placeholder="Add role, constraints, style, escalation rules, etc."
              />
            </div>
          </div>
        </Card>
      </Col>

      {/* Right chat preview */}
      <Col xs={24} lg={12}>
        <Card
          className="rounded-xl h-full"
          title={`${state.settings.displayName || "Assistant"} (Preview)`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refreshPreview}>
              Refresh
            </Button>
          }
        >
          <ChatPreview
            key={previewKey}
            displayName={state.settings.displayName}
            theme={state.settings.theme}
            initialMessages={initialMsgs}
            placeholder={state.settings.placeholder}
            userMsgColor={state.settings.userMessageColor}
          />
        </Card>
      </Col>
    </Row>
  );

  // SETTINGS
  const Settings = (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card className="rounded-xl" title="Chat Interface">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <Text type="secondary">Initial Messages</Text>
                <Button size="small" onClick={resetInitialMsgs}>
                  Reset
                </Button>
              </div>
              <TextArea
                className="mt-1"
                autoSize={{ minRows: 3, maxRows: 10 }}
                value={initialMsgs.join("\n")}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    settings: { ...s.settings, initialMessages: e.target.value.split("\n") },
                  }))
                }
                placeholder="Each message on a new line…"
              />
            </div>

            <div>
              <Text type="secondary">Suggested Messages</Text>
              <TextArea
                className="mt-1"
                autoSize={{ minRows: 2, maxRows: 6 }}
                value={(state.settings.suggestedMessages || []).join("\n")}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    settings: { ...s.settings, suggestedMessages: e.target.value.split("\n") },
                  }))
                }
                placeholder="One per line (e.g., Ideas, Inspiration, …)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">Message Placeholder</Text>
                <Input
                  className="mt-1"
                  value={state.settings.placeholder}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, placeholder: e.target.value },
                    }))
                  }
                  placeholder="Message…"
                />
              </div>

              <div className="flex items-center gap-4 mt-6 sm:mt-0">
                <span className="text-gray-500">Collect User Feedback</span>
                <Switch
                  checked={!!state.settings.collectFeedback}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, collectFeedback: v },
                    }))
                  }
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-500">Regenerate Messages</span>
                <Switch
                  checked={!!state.settings.regenerateMessages}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, regenerateMessages: v },
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Text type="secondary">Footer</Text>
              <TextArea
                className="mt-1"
                maxLength={200}
                showCount
                autoSize={{ minRows: 2, maxRows: 6 }}
                value={state.settings.footer}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    settings: { ...s.settings, footer: e.target.value },
                  }))
                }
                placeholder="Optional disclaimer or link to your privacy policy…"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">Theme</Text>
                <Select
                  className="w-full mt-1"
                  value={state.settings.theme}
                  onChange={(v) =>
                    setState((s) => ({ ...s, settings: { ...s.settings, theme: v } }))
                  }
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
              </div>
              <div>
                <Text type="secondary">Display name</Text>
                <Input
                  className="mt-1"
                  value={state.settings.displayName}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, displayName: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">Profile Picture</Text>
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={async ({ file }) => {
                    if (file?.originFileObj) {
                      const b64 = await toBase64(file.originFileObj);
                      setState((s) => ({
                        ...s,
                        settings: { ...s.settings, profilePicture: b64 },
                      }));
                    }
                  }}
                  onRemove={() =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, profilePicture: null },
                    }))
                  }
                >
                  {state.settings.profilePicture ? null : <div>Upload</div>}
                </Upload>
              </div>

              <div>
                <Text type="secondary">Chat Icon</Text>
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={async ({ file }) => {
                    if (file?.originFileObj) {
                      const b64 = await toBase64(file.originFileObj);
                      setState((s) => ({
                        ...s,
                        settings: { ...s.settings, chatIcon: b64 },
                      }));
                    }
                  }}
                  onRemove={() =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, chatIcon: null },
                    }))
                  }
                >
                  {state.settings.chatIcon ? null : <div>Upload</div>}
                </Upload>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">User Message Color</Text>
                <div className="mt-2">
                  {/* Ant v5 ColorPicker; fallback to input if unavailable */}
                  {ColorPicker ? (
                    <ColorPicker
                      value={state.settings.userMessageColor}
                      onChangeComplete={(c) =>
                        setState((s) => ({
                          ...s,
                          settings: { ...s.settings, userMessageColor: c.toHexString() },
                        }))
                      }
                    />
                  ) : (
                    <input
                      type="color"
                      value={state.settings.userMessageColor || "#1677ff"}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          settings: { ...s.settings, userMessageColor: e.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Col>

      {/* Live preview (same card as right pane for convenience) */}
      <Col xs={24} lg={12}>
        <Card
          className="rounded-xl h-full"
          title={`${state.settings.displayName || "Assistant"} (Preview)`}
          extra={
            <Button icon={<SyncOutlined />} onClick={refreshPreview}>
              Regenerate
            </Button>
          }
        >
          <ChatPreview
            key={`settings-${previewKey}`}
            displayName={state.settings.displayName}
            theme={state.settings.theme}
            initialMessages={initialMsgs}
            placeholder={state.settings.placeholder}
            userMsgColor={state.settings.userMessageColor}
          />
        </Card>
      </Col>
    </Row>
  );

  // SOURCES
  const Sources = (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card className="rounded-xl" title="Data Sources">
          <Text className="block mb-3">
            Add your data sources to train your chatbot.
          </Text>
          <Dragger
            multiple
            beforeUpload={() => false}
            showUploadList={true}
            onChange={async ({ fileList }) => {
              // Calculate chars for text-like files; keep safe fallback
              let total = 0;
              const items = [];
              for (const f of fileList) {
                const file = f.originFileObj || f;
                let chars = 0;
                if (file && /^text|application\/(json|csv)/.test(file.type || "")) {
                  chars = await readChars(file).catch(() => 0);
                }
                total += chars;
                items.push({ name: f.name, size: f.size || 0, chars });
              }
              setState((s) => ({
                ...s,
                sources: { ...s.sources, files: items, totalChars: total },
              }));
            }}
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined />
            </p>
            <p className="ant-upload-text">
              Drag & drop files here, or click to select files
            </p>
            <p className="ant-upload-hint">
              Supported: pdf, doc, docx, txt, csv, json (character count best-effort).
            </p>
          </Dragger>

          <Divider />

          <List
            header={<div>Files</div>}
            dataSource={state.sources.files}
            locale={{ emptyText: "No files added." }}
            renderItem={(item) => (
              <List.Item>
                <Space className="w-full justify-between">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500 text-sm">
                    {item.size ? `${(item.size / 1024).toFixed(1)} KB` : "-"} •{" "}
                    {item.chars ? `${item.chars.toLocaleString()} chars` : "-"}
                  </span>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Card className="rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total detected characters</div>
              <div className="text-2xl font-bold">
                {state.sources.totalChars?.toLocaleString?.() ?? "-"}
              </div>
              <div className="text-xs text-gray-400">/ 11,000,000 limit</div>
            </div>
            <Button type="primary" icon={<PlusOutlined />}>
              Create Chatbot
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  );

  // PLACEHOLDERS (Activity, Analytics, Connect)
  const Placeholder = ({ title }) => (
    <Card className="rounded-xl">
      <Title level={5} className="!mb-2">
        {title}
      </Title>
      <Text type="secondary">No data yet. Configure your agent and add sources.</Text>
    </Card>
  );

  const items = [
    { key: "playground", label: "Playground", children: Playground },
    { key: "activity", label: "Activity", children: <Placeholder title="Activity" /> },
    { key: "analytics", label: "Analytics", children: <Placeholder title="Analytics" /> },
    { key: "sources", label: "Sources", children: Sources },
    { key: "connect", label: "Connect", children: <Placeholder title="Connect" /> },
    { key: "settings", label: "Settings", children: Settings },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      <div className="flex items-center justify-between mb-3">
        <Title level={3} className="!mb-0">
          Manage & Train AI Agent
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refreshPreview}>
            Refresh preview
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveToChatbot} loading={saving}>
            Save to chatbot
          </Button>
        </Space>
      </div>

      <Card className="rounded-2xl">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          tabBarGutter={8}
        />
      </Card>
    </div>
  );
}

/* --------------------------- Chat Preview --------------------------- */
function ChatPreview({
  displayName = "Assistant",
  theme = "light",
  initialMessages = [],
  placeholder = "Message…",
  userMsgColor = "#1677ff",
}) {
  const isDark = theme === "dark";
  const bg = isDark ? "bg-gray-900" : "bg-white";
  const botBubble = isDark ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900";
  const userBubble = { background: userMsgColor, color: "#fff" };

  return (
    <div
      className={`rounded-xl border ${bg} p-3 h-[480px] flex flex-col`}
      style={{ borderColor: isDark ? "#334155" : "#e5e7eb" }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <Text strong>{displayName || "-"}</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => {}}>
          {/* purely cosmetic */}
        </Button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-auto space-y-2">
        {initialMessages.length ? (
          initialMessages.map((m, i) => (
            <div key={i} className="flex">
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${botBubble}`}>{dash(m)}</div>
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-sm">No initial messages.</div>
        )}

        {/* simple user reply bubble */}
        <div className="flex justify-end">
          <div className="max-w-[80%] px-3 py-2 rounded-2xl" style={userBubble}>
            Hello
          </div>
        </div>
      </div>

      {/* input */}
      <div className={`mt-2 rounded-lg border ${isDark ? "bg-gray-800" : "bg-white"}`}>
        <Input
          disabled
          placeholder={placeholder || "Message…"}
          className="border-0 shadow-none"
        />
      </div>
    </div>
  );
}
