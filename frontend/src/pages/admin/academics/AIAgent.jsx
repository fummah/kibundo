// src/pages/admin/agents/AIAgent.jsx
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

// Ant Design
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
  ColorPicker,
  Avatar,
  Modal,
  Form,
  App,
  Dropdown,
  Pagination,
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const { useApp } = App;

const AgentForm = lazy(() => import("@/pages/admin/agents/AgentForm"));

// Helpers
const dash = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "-" : v;

async function readChars(file) {
  const text = await file.text();
  return text.length;
}

// Optional presets (UI defaults only; NOT stored)
const AGENT_CONFIGS = {
  default: {
    name: "Default Agent",
    description: "A general-purpose assistant",
    systemPrompt: "You are a helpful assistant.",
    instructions: "Be helpful and concise in your responses.",
    model: "gpt-4o",
    temperature: 0.7,
    initialMessages: ["Hi! How can I help today?"],
  },
  ParentAgent: {
    name: "Parent Assistant",
    description: "Helps parents with billing, progress, and school info.",
    systemPrompt: "You assist parents of learners in Kibundo.",
    instructions: "Be empathetic and precise.",
    model: "gpt-4o-mini",
    temperature: 0.6,
    initialMessages: ["Welcome 👋 Need help with invoices or progress?"],
  },
  ChildAgent: {
    name: "Student Helper",
    description: "Guides students with assignments and study tips.",
    systemPrompt: "You are a friendly tutor.",
    instructions: "Explain simply. Use examples.",
    model: "gpt-4o-mini",
    temperature: 0.7,
    initialMessages: ["Hey! Which subject are we tackling today?"],
  },
  TeacherAgent: {
    name: "Teacher Support",
    description: "Assists teachers with classes, grading, and content.",
    systemPrompt: "You help teachers manage classes, assignments, and evaluations.",
    instructions: "Be structured. Offer checklists.",
    model: "gpt-4.1",
    temperature: 0.5,
    initialMessages: ["Hello! Want to set up a class or a worksheet?"],
  },
};

// —————————————————————————————— Normalizer for /entities ——————————————————————————————
function normalizeEntitiesPayload(raw) {
  if (!raw) return [];
  let list = Array.isArray(raw) ? raw : raw.items || raw.rows || raw.data || raw.tables || raw.list;
  if (!Array.isArray(list) && typeof raw === "object") list = Object.keys(raw);
  if (!Array.isArray(list)) return [];
  const opts = list
    .map((x) => {
      if (typeof x === "string") return { value: x, label: x };
      if (x == null) return null;
      const value = x.value ?? x.id ?? x.table_name ?? x.name ?? x.label ?? x.slug ?? x.key;
      const label = x.label ?? x.name ?? x.table_name ?? value;
      if (!value) return null;
      return { value: String(value), label: String(label ?? value) };
    })
    .filter(Boolean);
  const seen = new Set();
  return opts.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
}

export default function AIAgent() {
  const navigate = useNavigate();
  const { message } = useApp();

  const [state, setState] = useState({
    playground: {
      selectedAgent: "",
      selectedStudentAgent: "",
      systemPrompt: "",
      instructions: "",
      model: "gpt-4o",
      temperature: 0.7,
      status: "idle",
    },
    settings: {
      displayName: "",
      initialMessages: [],
      suggestedMessages: [],
      placeholder: "Type your message...",
      userMessageColor: "#1677ff",
      theme: "light",
      footer: "",
      collectFeedback: false,
      regenerateMessages: false,
    },
    sources: {
      agents: [],
      _tmpAgentName: "",
      _tmpEntities: [],
      _tmpApi: "",
      _tmpUrl: "",
      files: [],
      totalChars: 0,
    },
  });

  const [activeTab, setActiveTab] = useState("settings");
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState(null);
  const [users, setUsers] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [entitiesOptions, setEntitiesOptions] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [hasUserModifiedSettings, setHasUserModifiedSettings] = useState(() => {
    // Check if user has unsaved changes in localStorage
    const savedState = localStorage.getItem('aiAgent-unsaved-changes');
    return savedState === 'true';
  });

  const refreshPreview = useCallback(() => setPreviewKey((p) => p + 1), []);

  // Helper function to get agent details by name
  const getAgentDetails = useCallback((agentName) => {
    return state.sources.agents?.find(agent => agent.agent_name === agentName);
  }, [state.sources.agents]);

  // Helper function to get default agent for a specific role
  const getDefaultAgent = useCallback((role) => {
    switch (role) {
      case 'parent':
        return state.playground.selectedAgent;
      case 'child':
        return state.playground.selectedStudentAgent;
      default:
        return 'default';
    }
  }, [state.playground.selectedAgent, state.playground.selectedStudentAgent]);

  // Pagination logic
  const totalAgents = state.sources.agents?.length || 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAgents = state.sources.agents?.slice(startIndex, endIndex) || [];

  // ——————————————— API calls ———————————————
  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const { data } = await api.get("/states");
      const list = Array.isArray(data) ? data : data.items || data.rows || [];
      setStates(
        list.map((st) => ({
          id: st.id || st.state_id || st.value || st.code || st.name,
          name: st.state_name || st.name || st.label || st.title || String(st),
        }))
      );
    } catch (err) {
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchEntities = async () => {
    setEntitiesLoading(true);
    try {
      const { data } = await api.get("/entities");
      const opts = normalizeEntitiesPayload(data);
      setEntitiesOptions(opts);
      if (opts.length === 0) message.warning("Entities endpoint returned no items.");
    } catch (err) {
      message.error("Failed to load entities.");
    } finally {
      setEntitiesLoading(false);
    }
  };

  const fetchAgents = async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const { data } = await api.get("/agents");
      const agents = Array.isArray(data) ? data : [];
      setState((s) => ({ ...s, sources: { ...s.sources, agents } }));
      
    } catch (err) {
      setAgentsError(err.message);
      message.error("Failed to fetch agents");
    } finally {
      setAgentsLoading(false);
    }
  };
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/users");
      console.log("🎯 Frontend: All users received:", data);
      
      const map = {};
      (Array.isArray(data) ? data : []).forEach((u) => {
        const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
        map[String(u.id)] = {
          name: fullName || u.email || `User ${u.id}`,
          avatar: u.avatar || u.photo_url || u.image || u.picture || null,
        };
        console.log("🎯 Frontend: Mapped user:", {
          id: u.id,
          fullName,
          mapped: map[String(u.id)]
        });
      });
      
      console.log("🎯 Frontend: Final users map:", map);
      setUsers(map);
    } catch (err) {
      message.error("Failed to load user data");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserById = async (userId) => {
    try {
      console.log("🎯 Frontend: Fetching user by ID:", userId);
      const { data } = await api.get(`/debug-user/${userId}`);
      console.log("🎯 Frontend: User data received:", data);
      
      if (data.found && data.user) {
        const user = data.user;
        const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
        const userData = {
          name: fullName || user.email || `User ${user.id}`,
          avatar: user.avatar || user.photo_url || user.image || user.picture || null,
        };
        
        // Update the users map with the fetched user
        setUsers(prev => ({
          ...prev,
          [String(userId)]: userData
        }));
        
        console.log("🎯 Frontend: Updated users map with fetched user:", userData);
        return userData;
      }
    } catch (err) {
      console.error("🎯 Frontend: Failed to fetch user by ID:", err);
    }
    return null;
  };

  const createAgent = async (agentData) => {
    setLoading(true);
    try {
      // Check if current user is admin before creating agent
      const currentUser = JSON.parse(localStorage.getItem('kibundo_user') || '{}');
      console.log("🎯 Current user creating agent:", currentUser);
      
      if (!currentUser || !currentUser.role_id || currentUser.role_id !== 1) {
        message.error("Only administrators can create agents. Please log in as an admin.");
        return false;
      }
      
      await api.post("/addagent", agentData);
      message.success("Agent created successfully");
      await fetchAgents();
      await fetchUsers(); // Refresh users data to ensure creator info is available
      setCurrentPage(1); // Reset to first page after creating agent
      setState((s) => ({
        ...s,
        sources: {
          ...s.sources,
          _tmpAgentName: "",
          _tmpEntities: [],
          _tmpApi: "",
          _tmpUrl: "",
          files: [],
          totalChars: 0,
        },
      }));
      return true;
    } catch (err) {
      message.error("Failed to create agent");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    setLoadingGrades(true);
    try {
      const { data } = await api.get("/allclasses");
      const list = Array.isArray(data) ? data : data.items || [];
      setGrades(
        list.map((g) => ({
          value: g.id,
          label: g.name || g.class_name || `Grade ${g.id}`,
        }))
      );
    } catch (e) {
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchAiSettings = async () => {
    // Only fetch settings if user hasn't modified them
    if (hasUserModifiedSettings) {
      return;
    }
    
    try {
      const { data } = await api.get("/aisettings");
      if (data) {
        setState((s) => ({
          ...s,
          playground: {
            ...s.playground,
            selectedAgent: data.parent_default_ai || "",
            selectedStudentAgent: data.child_default_ai || "",
            model: data.openai_model || "gpt-4o",
            temperature: data.temperature || 0.7,
          },
        }));
      }
    } catch (err) {
    }
  };

  const saveToChatbot = async () => {
    setSaving(true);
    try {
      // Save AI Agent Settings using the new endpoint
      const aiSettingsPayload = {
        parent_default_ai: state.playground.selectedAgent || "",
        child_default_ai: state.playground.selectedStudentAgent || "",
        openai_model: state.playground.model || "gpt-4o",
        temperature: state.playground.temperature || 0.7,
      };

      await api.put("/updateaisettings", aiSettingsPayload);
      message.success("AI Agent Settings saved successfully!");
      setHasUserModifiedSettings(false); // Reset flag after successful save
      // localStorage removed to prevent quota exceeded errors
      refreshPreview();
    } catch (error) {
      message.error("Failed to save AI agent settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateAgentSettings = async (agentId, agentData) => {
    try {
      const payload = {
        id: agentId,
        agent_name: agentData.name,
        entities: agentData.entities,
        grade: agentData.grade,
        state: agentData.state,
        file_name: agentData.file_name,
        api: agentData.api,
      };

      await api.put("/updateaiagents", payload);
      message.success("Agent updated successfully!");
      await fetchAgents(); // Refresh the agents list
      return true;
    } catch (error) {
      message.error("Failed to update agent. Please try again.");
      return false;
    }
  };

  const openEditModal = (agent) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || "",
      entities: agent.entities || agent.prompts?.entities || [],
      grade: agent.grade || null,
      state: agent.state || null,
      file_name: agent.file_name || agent.prompts?.file_name || "",
      api: agent.api || agent.prompts?.api || "",
      url: agent.prompts?.url || "",
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingAgent(null);
    setEditFormData({});
  };

  const handleEditSubmit = async () => {
    if (!editingAgent) return;

    const success = await updateAgentSettings(editingAgent.id, editFormData);
    if (success) {
      closeEditModal();
    }
  };

  const deleteAgent = async (agentId, agentName) => {
    try {
      await api.delete(`/deleteagent/${agentId}`);
      message.success(`Agent "${agentName}" deleted successfully!`);
      await fetchAgents(); // Refresh the agents list
      
      // Adjust current page if needed after deletion
      const newTotal = (state.sources.agents?.length || 0) - 1;
      const maxPage = Math.ceil(newTotal / pageSize);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
      
      return true;
    } catch (error) {
      message.error("Failed to delete agent. Please try again.");
      return false;
    }
  };

  const handleDeleteAgent = (agent) => {
    Modal.confirm({
      title: 'Delete Agent',
      content: `Are you sure you want to delete the agent "${agent.name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        return deleteAgent(agent.id, agent.name);
      },
    });
  };

  // Save state to localStorage whenever it changes
  // Removed localStorage usage to prevent quota exceeded errors

  useEffect(() => {
    fetchStates();
    fetchEntities();
    fetchAgents();
    fetchUsers();
    fetchGrades();
    fetchAiSettings();
  }, []);

  const initialMsgs = useMemo(
    () => (Array.isArray(state.settings.initialMessages) ? state.settings.initialMessages : []),
    [state.settings.initialMessages]
  );

  /* --------------------------- Tabs Content --------------------------- */

  const Settings = (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card
          className="rounded-xl"
          title={
            <Space>
              <span>AI Agent Settings</span>
              <Tag color="green">{state.playground.status || "idle"}</Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveToChatbot}
              loading={saving}
            >
              Save AI Settings
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Text type="secondary">Select Parent Agent</Text>
              <Select
                className="w-full mt-1"
                value={state.playground.selectedAgent}
                placeholder="Choose an agent…"
                allowClear={true}
                optionFilterProp="label"
                onChange={(value) => {
                  setHasUserModifiedSettings(true);
                  const preset = AGENT_CONFIGS[value] || AGENT_CONFIGS.default;
                  setState((s) => ({
                    ...s,
                    playground: {
                      ...s.playground,
                      selectedAgent: value,
                      systemPrompt: preset.systemPrompt,
                      instructions: preset.instructions,
                      model: preset.model || s.playground.model,
                      temperature:
                        typeof preset.temperature === "number"
                          ? preset.temperature
                          : s.playground.temperature,
                    },
                  }));
                  setState((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      initialMessages:
                        s.settings.initialMessages?.length
                          ? s.settings.initialMessages
                          : preset.initialMessages || [],
                    },
                  }));
                  refreshPreview();
                }}
                options={(() => {
                  // Get all agents from API - try different property names
                  const apiAgents = (state.sources.agents || [])
                    .filter(agent => {
                      const hasName = agent && (agent.agent_name || agent.name || agent.agentName) && 
                                     (agent.agent_name || agent.name || agent.agentName).trim();
                      return hasName;
                    })
                    .map(agent => {
                      const agentName = agent.agent_name || agent.name || agent.agentName;
                      const entities = agent.entities || agent.entities_list || agent.entity_list;
                      return {
                        value: agentName,
                        label: agentName,
                        description: entities ? `Entities: ${entities}` : undefined
                      };
                    });
                  
                  // Return only API agents, no default options
                  return apiAgents;
                })()}
              />
            </div>

            <div>
              <Text type="secondary">Select Student Agent</Text>
              <Select
                className="w-full mt-1"
                value={state.playground.selectedStudentAgent}
                placeholder="Choose a student agent…"
                allowClear={true}
                optionFilterProp="label"
                onChange={(value) => {
                  setHasUserModifiedSettings(true);
                  setState((s) => ({
                    ...s,
                    playground: {
                      ...s.playground,
                      selectedStudentAgent: value,
                    },
                  }));
                }}
                options={(() => {
                  // Get all agents from API - try different property names
                  const apiAgents = (state.sources.agents || [])
                    .filter(agent => {
                      const hasName = agent && (agent.agent_name || agent.name || agent.agentName) && 
                                     (agent.agent_name || agent.name || agent.agentName).trim();
                      return hasName;
                    })
                    .map(agent => {
                      const agentName = agent.agent_name || agent.name || agent.agentName;
                      const entities = agent.entities || agent.entities_list || agent.entity_list;
                      return {
                        value: agentName,
                        label: agentName,
                        description: entities ? `Entities: ${entities}` : undefined
                      };
                    });
                  
                  // Return only API agents, no default options
                  return apiAgents;
                })()}
              />
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">Model</Text>
                <Select
                  className="w-full mt-1"
                  value={state.playground.model}
                  placeholder="Select a model…"
                  allowClear
                  optionFilterProp="label"
                  onChange={(v) => {
                    setHasUserModifiedSettings(true);
                    setState((s) => ({
                      ...s,
                      playground: { ...s.playground, model: v },
                    }));
                  }}
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
                  onChange={(v) => {
                    setHasUserModifiedSettings(true);
                    setState((s) => ({
                      ...s,
                      playground: { ...s.playground, temperature: v },
                    }));
                  }}
                />
              </div>
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
                    settings: {
                      ...s.settings,
                      suggestedMessages: e.target.value
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                placeholder="One per line (e.g., 'Show billing', 'Progress report', …)"
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
                  placeholder="Choose theme…"
                  allowClear
                  optionFilterProp="label"
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, theme: v },
                    }))
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
                  placeholder="e.g., Parent Assistant"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text type="secondary">User Message Color</Text>
                <div className="mt-2">
                  <ColorPicker
                    value={state.settings.userMessageColor}
                    onChangeComplete={(c) =>
                      setState((s) => ({
                        ...s,
                        settings: {
                          ...s.settings,
                          userMessageColor: c.toHexString(),
                        },
                      }))
                    }
                  />
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
          extra={null}
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

  const Sources = (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card
          className="rounded-xl"
          title="Agents"
          extra={
            <Tag color="blue">{(state.sources.agents?.length || 0)} total</Tag>
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
            <>
              <List
                itemLayout="vertical"
                dataSource={paginatedAgents}
              renderItem={(a) => {
                const creator = users[String(a.created_by)] || {};
                let creatorName = "Unknown";
                
                console.log("🎯 Agent creator info:", {
                  agent_id: a.id,
                  agent_name: a.name,
                  created_by: a.created_by,
                  creator_user: creator,
                  all_users: users
                });
                
                if (creator.name) {
                  creatorName = creator.name;
                } else if (a.created_by) {
                  // Try to fetch the user data if not found in the users list
                  console.log("🎯 User not found in users list, attempting to fetch user data for ID:", a.created_by);
                  fetchUserById(a.created_by);
                  // Show a more descriptive fallback while fetching
                  creatorName = `Admin (ID: ${a.created_by})`;
                }
                
                const creatorAvatar = creator.avatar || null;
                const initial = (creatorName?.charAt?.(0) || "U").toUpperCase();

                return (
                  <List.Item key={a.id}>
                    <Space direction="vertical" className="w-full">
                      <Space className="w-full justify-between">
                        <Text strong>{a.name}</Text>
                        <Space direction="vertical" align="end" size="small">
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'edit',
                                  label: 'Edit',
                                  icon: <EditOutlined />,
                                  onClick: () => openEditModal(a),
                                },
                                {
                                  key: 'delete',
                                  label: 'Delete',
                                  icon: <DeleteOutlined />,
                                  danger: true,
                                  onClick: () => handleDeleteAgent(a),
                                },
                              ],
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <Button
                              size="small"
                              icon={<MoreOutlined />}
                              type="text"
                            />
                          </Dropdown>
                          <Text type="secondary" className="text-xs">
                            {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                          </Text>
                        </Space>
                      </Space>

                      {a.description && (
                        <Text type="secondary" className="text-sm">
                          {a.description}
                        </Text>
                      )}

                      <Space wrap>
                        {a.version && <Tag color="blue">v{a.version}</Tag>}
                        {a.stage && (
                          <Tag color={a.stage === "prod" ? "green" : "orange"}>{a.stage}</Tag>
                        )}
                        {a.grade && <Tag color="purple">Grade: {a.grade}</Tag>}
                        {a.state && <Tag color="cyan">State: {a.state}</Tag>}
                        {(a.prompts?.entities || a.entities || []).map((entity) => (
                          <Tag key={entity} color="geekblue">
                            {entity}
                          </Tag>
                        ))}
                      </Space>

                      {/* ✅ Avatar + Creator Name */}
                      {a.created_by && (
                        <Space size="small" align="center" className="mt-1">
                          <Avatar
                            size="small"
                            src={creatorAvatar || undefined}
                            style={{ backgroundColor: "#1890ff" }}
                          >
                            {initial}
                          </Avatar>
                          <Text type="secondary" className="text-xs">
                            Created by{" "}
                            <Text strong>{creatorName}</Text>
                          </Text>
                        </Space>
                      )}

                      {a.prompts?.url && (
                        <Text type="secondary" className="text-xs">
                          URL: {a.prompts.url}
                        </Text>
                      )}
                    </Space>
                  </List.Item>
                );
              }}
            />
            
            {/* Pagination Controls */}
            {totalAgents > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={currentPage}
                  total={totalAgents}
                  pageSize={pageSize}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  showQuickJumper={false}
                  showTotal={(total, range) => 
                    `${range[0]}-${range[1]} of ${total} agents`
                  }
                />
              </div>
            )}
            </>
          )}
        </Card>
      </Col>

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
              placeholder="Select State…"
              className="w-full mt-3"
              value={selectedState || undefined}
              onChange={setSelectedState}
              loading={loadingStates}
              allowClear
              optionFilterProp="label"
              options={states.map((st) => ({ value: st.id, label: st.name }))}
            />

            <Select
              size="large"
              placeholder="Select Grade…"
              className="w-full mt-3"
              value={selectedGrade || undefined}
              onChange={setSelectedGrade}
              loading={loadingGrades}
              allowClear
              optionFilterProp="label"
              options={grades}
            />

            {/* Entities from /entities */}
            <Select
              size="large"
              mode="multiple"
              allowClear
              showSearch
              placeholder="Select Entities…"
              value={state.sources._tmpEntities || []}
              onChange={(vals) =>
                setState((s) => ({
                  ...s,
                  sources: { ...s.sources, _tmpEntities: vals },
                }))
              }
              className="w-full"
              popupMatchSelectWidth={false}
              optionFilterProp="label"
              loading={entitiesLoading}
              options={entitiesOptions}
              notFoundContent={entitiesLoading ? "Loading..." : "No entities found"}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />

            <Divider />
            <Text className="block mb-2">Add your data sources to train your agent.</Text>

            <Dragger
              multiple
              beforeUpload={() => false}
              showUploadList
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

            <Input
              size="large"
              placeholder="Add API (optional)"
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
              placeholder="Add URL (optional)"
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
                    agent_name: name,
                    description: `Agent for ${entities.join(", ")}`,
                    state: selectedState || null,
                    grade: selectedGrade || null,
                    entities,
                    file_name: state.sources._tmpApi || "",
                    api: state.sources._tmpUrl || "",
                    version: "v1",
                    stage: "staging",
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

  const items = [
    { key: "sources", label: "Sources", children: Sources },
    { key: "settings", label: "Settings", children: Settings },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-4">
      <div className="flex items-center justify-between mb-3">
        <Typography.Title level={3} className="!mb-0">
          Kibundo (Manage & Train)
        </Typography.Title>
      </div>

      <Card className="rounded-2xl">
        <Tabs 
          key={`ai-agent-tabs-${activeTab}`}
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={items} 
          tabBarGutter={8}
        />
      </Card>

      <Suspense fallback={null}>
        {/* <AgentForm /> */}
      </Suspense>

      {/* Edit Agent Modal */}
      <Modal
        title="Edit Agent"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={closeEditModal}
        width={600}
        okText="Update Agent"
        cancelText="Cancel"
      >
        <Form layout="vertical">
          <Form.Item label="Agent Name">
            <Input
              value={editFormData.name || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              placeholder="Enter agent name"
            />
          </Form.Item>

          <Form.Item label="State">
            <Select
              placeholder="Select State"
              value={editFormData.state || undefined}
              onChange={(value) =>
                setEditFormData({ ...editFormData, state: value })
              }
              allowClear
              optionFilterProp="label"
              loading={loadingStates}
              options={states.map((st) => ({ value: st.id, label: st.name }))}
            />
          </Form.Item>

          <Form.Item label="Grade">
            <Select
              placeholder="Select Grade"
              value={editFormData.grade || undefined}
              onChange={(value) =>
                setEditFormData({ ...editFormData, grade: value })
              }
              allowClear
              optionFilterProp="label"
              loading={loadingGrades}
              options={grades}
            />
          </Form.Item>

          <Form.Item label="Entities">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Select Entities"
              value={editFormData.entities || []}
              onChange={(value) =>
                setEditFormData({ ...editFormData, entities: value })
              }
              optionFilterProp="label"
              loading={entitiesLoading}
              options={entitiesOptions}
              notFoundContent={entitiesLoading ? "Loading..." : "No entities found"}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="File Name">
            <Input
              value={editFormData.file_name || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, file_name: e.target.value })
              }
              placeholder="Enter file name"
            />
          </Form.Item>

          <Form.Item label="API">
            <Input
              value={editFormData.api || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, api: e.target.value })
              }
              placeholder="Enter API endpoint"
            />
          </Form.Item>
        </Form>
      </Modal>
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
          {/* cosmetic */}
        </Button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-auto space-y-2">
        {initialMessages.length ? (
          initialMessages.map((m, i) => (
            <div key={i} className="flex">
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${botBubble}`}>
                {dash(m)}
              </div>
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
        <Input disabled placeholder={placeholder || "Message…"} className="border-0 shadow-none" />
      </div>
    </div>
  );
}