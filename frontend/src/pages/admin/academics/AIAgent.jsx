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

// Agent configurations
const AGENT_CONFIGS = {
  ParentAgent: {
    name: "Parent Assistant",
    systemPrompt: "You are a helpful AI assistant for parents using the Kibundo education platform. You help parents with questions about their children's progress, school activities, billing, and general platform usage.",
    instructions: `### Role
- You are a Parent Assistant for the Kibundo education platform
- Help parents with questions about their children's academic progress, schedules, and activities
- Assist with billing inquiries, subscription management, and account settings
- Provide guidance on using platform features and resolving common issues

### Knowledge Areas
- Student progress tracking and reports
- Parent-teacher communication
- Billing and subscription management
- Platform navigation and features
- School policies and procedures

### Constraints
- Always be polite and professional
- Never reveal sensitive student information
- Direct complex issues to appropriate school staff
- Maintain parent privacy and data security`,
    initialMessages: ["Hello! I'm your Kibundo Parent Assistant. How can I help you with your child's education today?"],
    suggestedMessages: ["Check my child's progress", "Billing questions", "Schedule information", "Contact teachers"],
    displayName: "Parent Assistant",
    userMessageColor: "#1677ff",
  },
  ChildAgent: {
    name: "Student Helper",
    systemPrompt: "You are a friendly AI assistant designed to help students with their learning and schoolwork on the Kibundo platform.",
    instructions: `### Role
- You are a Student Helper for the Kibundo education platform
- Assist students with homework, study tips, and learning resources
- Help with understanding subjects and completing assignments
- Encourage positive learning habits and academic growth

### Knowledge Areas
- Homework assistance and explanations
- Study techniques and time management
- Subject-specific help and resources
- Test preparation and study guides
- Learning motivation and goal setting

### Constraints
- Provide guidance and explanations, not direct answers
- Encourage critical thinking and problem-solving
- Never do homework for students
- Promote academic integrity and honest work`,
    initialMessages: ["Hi there! I'm your Kibundo Student Helper. Ready to learn something new today?"],
    suggestedMessages: ["Help with homework", "Study tips", "Explain this topic", "Test preparation"],
    displayName: "Student Helper",
    userMessageColor: "#52c41a",
  },
  TeacherAgent: {
    name: "Teacher Support",
    systemPrompt: "You are an AI assistant designed to support teachers using the Kibundo education platform with administrative tasks, lesson planning, and student management.",
    instructions: `### Role
- You are a Teacher Support Assistant for the Kibundo education platform
- Help teachers with administrative tasks and classroom management
- Assist with lesson planning and resource organization
- Provide guidance on platform features and tools

### Knowledge Areas
- Lesson planning and curriculum management
- Student assessment and progress tracking
- Classroom management and communication
- Resource sharing and collaboration
- Administrative tasks and reporting

### Constraints
- Focus on educational support and efficiency
- Respect teacher autonomy and decision-making
- Maintain professional boundaries
- Protect student privacy and data security`,
    initialMessages: ["Hello! I'm your Kibundo Teacher Support Assistant. How can I help you manage your classroom today?"],
    suggestedMessages: ["Lesson planning", "Student progress", "Resource management", "Administrative tasks"],
    displayName: "Teacher Support",
    userMessageColor: "#fa8c16",
  },
};

const defaultState = {
  playground: {
    status: "trained",
    model: "gpt-4o",
    temperature: 0.3, // 0..1
    systemPrompt: AGENT_CONFIGS.ParentAgent.systemPrompt,
    instructions: AGENT_CONFIGS.ParentAgent.instructions,
    selectedAgent: "ParentAgent", // Default selected agent
  },
  settings: {
    initialMessages: AGENT_CONFIGS.ParentAgent.initialMessages,
    suggestedMessages: AGENT_CONFIGS.ParentAgent.suggestedMessages,
    placeholder: "Message...",
    footer: "",
    collectFeedback: true,
    regenerateMessages: true,
    theme: "light",
    displayName: AGENT_CONFIGS.ParentAgent.displayName,
    profilePicture: null, // base64 for demo
    chatIcon: null, // base64 for demo
    userMessageColor: AGENT_CONFIGS.ParentAgent.userMessageColor,
  },
  sources: {
    files: [], // [{name,size,chars}]
    totalChars: 0,
    // agents + create form temp values
    agents: [],
    _tmpAgentName: "",
    _tmpEntities: [],
    _tmpApi: "",   // Add API
    _tmpUrl: "",   // Add URL
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
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sources"); // jump users to Sources by default
  const [previewKey, setPreviewKey] = useState(0); // force chat preview refresh
  const [users, setUsers] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch users for name mapping on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  /* --------------------------- Actions --------------------------- */
  const saveToChatbot = async () => {
    setSaving(true);
    try {
      const currentAgent = state.playground.selectedAgent;
      const agentConfig = AGENT_CONFIGS[currentAgent];

      const chatbotConfig = {
        agentType: currentAgent,
        systemPrompt: state.playground.systemPrompt,
        instructions: state.playground.instructions,
        displayName: state.settings.displayName,
        initialMessages: state.settings.initialMessages,
        suggestedMessages: state.settings.suggestedMessages,
        placeholder: state.settings.placeholder,
        userMessageColor: state.settings.userMessageColor,
        model: state.playground.model,
        temperature: state.playground.temperature,
        theme: state.settings.theme,
        collectFeedback: state.settings.collectFeedback,
        regenerateMessages: state.settings.regenerateMessages,
        footer: state.settings.footer,
      };

      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/save-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatbotConfig)
      });

      if (!response.ok) {
        throw new Error(`Failed to save chatbot configuration: ${response.statusText}`);
      }

      const result = await response.json();
      message.success(`Chatbot configuration saved successfully for ${agentConfig.name}!`);

      // Refresh the preview to show the saved configuration
      refreshPreview();

    } catch (error) {
      console.error('Error saving chatbot configuration:', error);
      message.error('Failed to save chatbot configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetInitialMsgs = () => {
    const currentAgent = state.playground.selectedAgent;
    const agentConfig = AGENT_CONFIGS[currentAgent];
    setState((s) => ({
      ...s,
      settings: { ...s.settings, initialMessages: agentConfig.initialMessages },
    }));
  };

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  // API functions
  const fetchAgents = async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }

      const agents = await response.json();
      setState((s) => ({
        ...s,
        sources: { ...s.sources, agents }
      }));
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgentsError(error.message);
      message.error('Failed to fetch agents');
    } finally {
      setAgentsLoading(false);
    }
  };

  // Fetch users for name mapping
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const usersData = await response.json();
      // Create a mapping of user ID to name
      const usersMap = {};
      usersData.forEach(user => {
        usersMap[user.id] = `${user.first_name} ${user.last_name}`;
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't show error message for users, just use IDs as fallback
    } finally {
      setUsersLoading(false);
    }
  };

  const createAgent = async (agentData) => {
    setLoading(true);
    try {
      // Create agent locally for now (no backend POST endpoint)
      const newAgent = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()),
        name: agentData.name,
        description: agentData.description,
        prompts: agentData.prompts,
        version: agentData.version,
        stage: agentData.stage,
        created_by: 'current_user', // This should come from auth context
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setState((s) => ({
        ...s,
        sources: {
          ...s.sources,
          agents: [newAgent, ...(s.sources.agents || [])],
          // clear temp inputs
          _tmpAgentName: "",
          _tmpEntities: [],
          _tmpApi: "",
          _tmpUrl: "",
          files: [],
          totalChars: 0
        }
      }));

      message.success('Agent created successfully');
      return true;
    } catch (error) {
      console.error('Error creating agent:', error);
      message.error('Failed to create agent');
      return false;
    } finally {
      setLoading(false);
    }
  };

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
            {/* Agent Selection */}
            <div>
              <Text type="secondary">Select Agent</Text>
              <Select
                className="w-full mt-1"
                value={state.playground.selectedAgent}
                onChange={(value) => {
                  const agentConfig = AGENT_CONFIGS[value];
                  setState((s) => ({
                    ...s,
                    playground: {
                      ...s.playground,
                      selectedAgent: value,
                      systemPrompt: agentConfig.systemPrompt,
                      instructions: agentConfig.instructions,
                    },
                    settings: {
                      ...s.settings,
                      displayName: agentConfig.displayName,
                      initialMessages: agentConfig.initialMessages,
                      suggestedMessages: agentConfig.suggestedMessages,
                      userMessageColor: agentConfig.userMessageColor,
                    }
                  }));
                  refreshPreview();
                }}
                options={[
                  { value: "ParentAgent", label: "Parent Assistant" },
                  { value: "ChildAgent", label: "Student Helper" },
                  { value: "TeacherAgent", label: "Teacher Support" },
                ]}
              />
            </div>

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
                    Reserved <span className="mx-1">•</span> Creative
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
            key={`playground-${previewKey}-${state.playground.selectedAgent}`}
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
                <Text type="secondary">User Message Color</Text>
                <div className="mt-2">
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

      {/* Live preview */}
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

  // SOURCES (Create Agent includes Data Sources + Add API/URL at bottom)
  const Sources = (
    <Row gutter={[16, 16]}>
      {/* LEFT: Agents list */}
      <Col xs={24} lg={16}>
        <Card
          className="rounded-xl"
          title="Agents"
          extra={
            <Space>
              <Tag color="blue">{(state.sources.agents?.length || 0)} total</Tag>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={fetchAgents}
                loading={agentsLoading}
              >
                Refresh
              </Button>
            </Space>
          }
        >
          {agentsLoading ? (
            <div className="text-center py-4">
              <Text type="secondary">Loading agents...</Text>
            </div>
          ) : agentsError ? (
            <div className="text-center py-4">
              <Text type="danger">Error: {agentsError}</Text>
              <br />
              <Button onClick={fetchAgents} className="mt-2">
                Retry
              </Button>
            </div>
          ) : (state.sources.agents?.length || 0) === 0 ? (
            <Text type="secondary">No agents yet. Create one on the right.</Text>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={state.sources.agents}
              renderItem={(a) => (
                <List.Item key={a.id}>
                  <Space direction="vertical" className="w-full">
                    <Space className="w-full justify-between">
                      <Text strong>{a.name}</Text>
                      <Text type="secondary" className="text-xs">
                        {new Date(a.created_at).toLocaleString()}
                      </Text>
                    </Space>
                    {a.description && (
                      <Text type="secondary" className="text-sm">
                        {a.description}
                      </Text>
                    )}
                    <Space wrap>
                      <Tag color="blue">v{a.version}</Tag>
                      <Tag color={a.stage === 'prod' ? 'green' : 'orange'}>
                        {a.stage}
                      </Tag>
                      {a.prompts?.entities?.map((entity) => (
                        <Tag key={entity} color="geekblue">
                          {entity}
                        </Tag>
                      ))}
                    </Space>
                    <Text type="secondary" className="text-xs">
                      Created by <Text strong>{users[a.created_by] || a.created_by || 'Unknown'}</Text>
                    </Text>
                    {a.prompts?.url && (
                      <Text type="secondary" className="text-xs">URL: {a.prompts.url}</Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>

      {/* RIGHT: Create Agent (with Data Sources + Add API/URL at bottom) */}
      <Col xs={24} lg={8}>
        <Card className="rounded-xl" title="Create Agent">
          <Space direction="vertical" className="w-full">
            <Input
              size="large"
              placeholder="Agent Name"
              value={state.sources._tmpAgentName || ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  sources: { ...s.sources, _tmpAgentName: e.target.value },
                }))
              }
            />

            <Select
              size="large"
              mode="multiple"
              allowClear
              placeholder="Select Entities"
              value={state.sources._tmpEntities || []}
              onChange={(vals) =>
                setState((s) => ({
                  ...s,
                  sources: { ...s.sources, _tmpEntities: vals },
                }))
              }
              className="w-full"
              style={{ width: "100%" }}
              popupMatchSelectWidth={false}
              styles={{
                popup: {
                  root: { minWidth: 360 }
                }
              }}
              options={[
                { value: "School", label: "School" },
                { value: "Grade", label: "Grade" },
                { value: "Subject", label: "Subject" },
                { value: "Student", label: "Student" },
                { value: "Parent", label: "Parent" },
                { value: "Teacher", label: "Teacher" },
              ]}
            />

            <Divider />
            <Text className="block mb-2">Add your data sources to train your agent.</Text>

            <Dragger
              multiple
              beforeUpload={() => false}
              showUploadList={true}
              accept=".pdf,.doc,.docx,.txt,.csv,.json"
              onChange={async ({ fileList }) => {
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

            <List
              className="mt-3"
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

            <Divider />

            {/* Add API & Add URL (bottom) */}
            <Input
              size="large"
              placeholder="Add API"
              value={state.sources._tmpApi || ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  sources: { ...s.sources, _tmpApi: e.target.value },
                }))
              }
            />
            <Input
              size="large"
              placeholder="Add URL"
              value={state.sources._tmpUrl || ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  sources: { ...s.sources, _tmpUrl: e.target.value },
                }))
              }
            />

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total detected characters</div>
                <div className="text-2xl font-bold">
                  {state.sources.totalChars?.toLocaleString?.() ?? "-"}
                </div>
                <div className="text-xs text-gray-400">/ 11,000,000 limit</div>
              </div>

              <Button
                size="large"
                type="primary"
                icon={<PlusOutlined />}
                loading={loading}
                onClick={async () => {
                  const name = (state.sources._tmpAgentName || "").trim();
                  const entities = state.sources._tmpEntities || [];
                  if (!name) {
                    message.warning("Please enter an agent name.");
                    return;
                  }
                  if (!entities.length) {
                    message.warning("Please select at least one entity.");
                    return;
                  }

                  const agentData = {
                    name,
                    description: `Agent for ${entities.join(', ')}`,
                    prompts: {
                      system: state.playground.systemPrompt,
                      instructions: state.playground.instructions,
                      entities: entities,
                      api: state.sources._tmpApi || "",
                      url: state.sources._tmpUrl || ""
                    },
                    version: "v1",
                    stage: "staging"
                  };

                  await createAgent(agentData);
                }}
              >
                Create Agent
              </Button>
            </div>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  // Tabs
  const items = [
    { key: "playground", label: "Playground", children: Playground },
    { key: "sources", label: "Sources", children: Sources },
    { key: "settings", label: "Settings", children: Settings },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      <div className="flex items-center justify-between mb-3">
        <Title level={3} className="!mb-0">
          Kibundo (Manage & Train)
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refreshPreview}>
            Refresh preview
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
