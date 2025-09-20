// src/pages/newsletter/Newsletter.jsx
import { useMemo, useState, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Tag,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Drawer,
  message,
  Tooltip,
  Divider,
  Switch,
  Dropdown,
  InputNumber,
  Empty,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  ScheduleOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleTwoTone,
  ExclamationCircleTwoTone,
  MoreOutlined,
  CopyOutlined,
  ExperimentOutlined,
  SettingOutlined,
  GiftOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { Title, Text, Paragraph } = Typography;

/* -------------------------------------------------------------------------- */
/*                                   MOCKS                                    */
/* -------------------------------------------------------------------------- */

const STATES = ["All", "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"];
const GRADES = ["All", "1", "2", "3", "4", "5", "6"];
const SUB_STATUS = ["All", "active", "past_due", "canceled"];

const DUMMY_TEMPLATES = [
  {
    id: 1,
    name: "Welcome Parents",
    subject: "Welcome to Kibundo 🎒",
    category: "onboarding",
    body_html: "<h2>Welcome!</h2><p>We’re excited to have you.</p>",
    body_text: "Welcome! We’re excited to have you.",
    created_by: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Monthly Summary",
    subject: "Your child’s learning summary 📈",
    category: "report",
    body_html: "<h3>Highlights</h3><ul><li>Great progress!</li></ul>",
    body_text: "Highlights: Great progress!",
    created_by: 1,
    updated_at: new Date().toISOString(),
  },
];

const DUMMY_CAMPAIGNS = [
  { id: 101, name: "Back to School (BW, G2)", template_id: 1, status: "draft", scheduled_for: null, sent_at: null },
  { id: 102, name: "Monthly Summary – June", template_id: 2, status: "scheduled", scheduled_for: dayjs().add(2, "day").toISOString(), sent_at: null },
  { id: 103, name: "Onboarding Wave A", template_id: 1, status: "sent", scheduled_for: null, sent_at: dayjs().subtract(7, "day").toISOString() },
];

const DUMMY_OPTIN = [
  { parent_id: 1, email: "tina@example.com", opted_in: true, confirmed_at: dayjs().subtract(10, "day").toISOString() },
  { parent_id: 2, email: "omar@example.com", opted_in: false, confirmed_at: null },
  { parent_id: 3, email: "li@example.com", opted_in: true, confirmed_at: dayjs().subtract(3, "day").toISOString() },
];

const DUMMY_LOGS = Array.from({ length: 12 }).map((_, i) => ({
  id: 3000 + i,
  campaign_id: 103,
  email: `parent${i + 1}@mail.com`,
  event: i % 5 === 0 ? "bounced" : i % 4 === 0 ? "opened" : "sent",
  provider_id: `mock_${103}_${i}`,
  created_at: dayjs().subtract(i, "hour").toISOString(),
}));

/** Dummy targets to simulate the Reactivation evaluation. */
const DUMMY_REACTIVATION_TARGETS = [
  { user_id: 11, email: "tina@example.com",  name: "Tina", opened: true,  replied: true,  subscribed: true,  hoursSince: 50 },
  { user_id: 12, email: "omar@example.com",  name: "Omar", opened: true,  replied: true,  subscribed: false, hoursSince: 53 },
  { user_id: 13, email: "li@example.com",    name: "Li",   opened: false, replied: false, subscribed: false, hoursSince: 60 },
  { user_id: 14, email: "sam@example.com",   name: "Sam",  opened: true,  replied: false, subscribed: false, hoursSince: 12 },
  { user_id: 15, email: "jo@example.com",    name: "Jo",   opened: true,  replied: true,  subscribed: false, hoursSince: 10 },
];

/* -------------------------------------------------------------------------- */
/*                                UTIL HELPERS                                */
/* -------------------------------------------------------------------------- */

const stripHtml = (html) =>
  (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const genCode = (prefix = "TRY") =>
  `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

/* Feedback mail config (dummy) */
const FEEDBACK_URL = "/feedback";
const FEEDBACK_SUBJECT = "Quick feedback? 💬";

/* -------------------------------------------------------------------------- */
/*                                    UI                                      */
/* -------------------------------------------------------------------------- */

export default function Newsletter() {
  const [messageApi, contextHolder] = message.useMessage();
  const [templates, setTemplates] = useState(DUMMY_TEMPLATES);
  const [campaigns, setCampaigns] = useState(DUMMY_CAMPAIGNS);
  const [optin, setOptin] = useState(DUMMY_OPTIN);
  const [logs, setLogs] = useState(DUMMY_LOGS);

  const [stateFilter, setStateFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [subscriptionFilter, setSubscriptionFilter] = useState("All");

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Automations (timings are configurable via UI)
  const [automations, setAutomations] = useState({
    paid_feedback_delay_hours: 1,
    trial_ended_feedback_delay_hours: 4,
  });

  // Reactivation UI (dummy)
  const [reactWindowHours, setReactWindowHours] = useState(48);
  const [reactResults, setReactResults] = useState([]);
  const [reactDrawerOpen, setReactDrawerOpen] = useState(false);
  const [reactRunning, setReactRunning] = useState(false);

  const colorByStatus = (s) =>
    s === "sent" ? "green" : s === "scheduled" ? "blue" : "default";

  const tplById = useMemo(() => {
    const m = new Map();
    templates.forEach((t) => m.set(t.id, t));
    return m;
  }, [templates]);

  /* ------------------------------- handlers -------------------------------- */

  // Templates
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateModalOpen(true);
  };
  const openEditTemplate = (record) => {
    setEditingTemplate(record);
    setTemplateModalOpen(true);
  };
  const deleteTemplate = (id) => {
    Modal.confirm({
      title: "Delete template?",
      content: "This action cannot be undone.",
      okButtonProps: { danger: true },
      onOk: () => {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        messageApi.success("Template deleted");
      },
    });
  };
  const openPreview = (record) => {
    setPreviewTemplate(record);
    setPreviewOpen(true);
  };

  // Campaigns
  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignModalOpen(true);
  };
  const openEditCampaign = (record) => {
    setEditingCampaign(record);
    setCampaignModalOpen(true);
  };
  const sendNow = (record) => {
    const sentAt = new Date().toISOString();
    setCampaigns((prev) =>
      prev.map((c) => (c.id === record.id ? { ...c, status: "sent", sent_at: sentAt, scheduled_for: null } : c))
    );
    const t = tplById.get(record.template_id);
    const newLogs = optin
      .filter((o) => o.opted_in)
      .slice(0, 8)
      .map((o, idx) => ({
        id: Math.max(0, ...logs.map((l) => l.id)) + idx + 1,
        campaign_id: record.id,
        email: o.email,
        event: "sent",
        provider_id: `mock_${record.id}_${o.parent_id}`,
        created_at: new Date().toISOString(),
        subject: t?.subject,
      }));
    setLogs((prev) => [...newLogs, ...prev]);
    messageApi.success(`Campaign "${record.name}" sent to ${newLogs.length} recipients`);
  };
  const scheduleCampaign = (record) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === record.id ? { ...c, status: "scheduled", scheduled_for: dayjs().add(1, "day").toISOString() } : c
      )
    );
    messageApi.success(`Campaign "${record.name}" scheduled for tomorrow`);
  };
  const deleteCampaign = (id) => {
    Modal.confirm({
      title: "Delete campaign?",
      okButtonProps: { danger: true },
      onOk: () => {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        messageApi.success("Campaign deleted");
      },
    });
  };
  const duplicateCampaign = (record) => {
    const nextId = Math.max(0, ...campaigns.map((c) => c.id)) + 1;
    setCampaigns((prev) => [
      { ...record, id: nextId, name: `${record.name} (copy)`, status: "draft", scheduled_for: null, sent_at: null },
      ...prev,
    ]);
    messageApi.success("Campaign duplicated");
  };
  const testSendCampaign = (record) => {
    Modal.confirm({
      title: "Send test email?",
      content: "A sample will be sent to the configured test inbox.",
      onOk: () => messageApi.success(`Test of "${record.name}" sent (simulated)`),
    });
  };

  const toggleOptin = (parent_id, val) => {
    setOptin((prev) => prev.map((o) => (o.parent_id === parent_id ? { ...o, opted_in: val } : o)));
  };

  /* --------------------------- Reactivation (dummy) --------------------------- */

  const evaluateTarget = (t, windowHours) => {
    if (t.replied && t.subscribed) return { action: "none", reason: "replied_and_subscribed" };
    if (t.replied && !t.subscribed) {
      if (t.hoursSince >= windowHours) return { action: "award", days: 5, reason: "reply_no_sub_after_window" };
      return { action: "wait", reason: "reply_within_window" };
    }
    if (t.hoursSince >= windowHours && (!t.opened || !t.replied)) {
      return { action: "award", days: 10, reason: "no_open_or_no_reply_after_window" };
    }
    return { action: "wait", reason: "within_window" };
  };

  const previewReactivation = () => {
    const results = DUMMY_REACTIVATION_TARGETS.map((u) => {
      const evalr = evaluateTarget(u, reactWindowHours);
      return { userId: u.user_id, email: u.email, name: u.name, ...evalr, code: null };
    });
    setReactResults(results);
    setReactDrawerOpen(true);
    messageApi.success("Preview generated");
  };

  const runReactivation = async () => {
    setReactRunning(true);
    const nowIdStart = Math.max(0, ...logs.map((l) => l.id)) + 1;
    let idInc = 0;

    const results = DUMMY_REACTIVATION_TARGETS.map((u) => {
      const evalr = evaluateTarget(u, reactWindowHours);
      if (evalr.action === "award") {
        const code = genCode("TRY");
        const logRow = {
          id: nowIdStart + (idInc++),
          campaign_id: 0,
          email: u.email,
          event: "sent",
          provider_id: `reactivation_${u.user_id}`,
          created_at: new Date().toISOString(),
          subject: `Your ${evalr.days} free test days — redeem code ${code}`,
        };
        setLogs((prev) => [logRow, ...prev]);
        return { userId: u.user_id, email: u.email, name: u.name, ...evalr, code };
      }
      return { userId: u.user_id, email: u.email, name: u.name, ...evalr, code: null };
    });

    setReactResults(results);
    setReactDrawerOpen(true);
    setReactRunning(false);
    const awarded = results.filter((r) => r.action === "award").length;
    messageApi.success(`Run complete: ${awarded} coupon email(s) sent`);
  };

  /* ---------------------- Feedback (paid / trial-ended) ---------------------- */
  // Uses dummy opt-in list; writes to logs immediately (no async scheduling here).
  const sendFeedbackEmails = (reason, delayHours) => {
    const recipients = optin.filter((o) => o.opted_in);
    if (!recipients.length) return messageApi.info("No opted-in recipients.");
    const baseId = Math.max(0, ...logs.map((l) => l.id)) + 1;

    const subject =
      reason === "paid"
        ? `${FEEDBACK_SUBJECT} (thanks for subscribing!)`
        : `${FEEDBACK_SUBJECT} (your trial just ended)`;

    const entries = recipients.slice(0, 12).map((o, i) => ({
      id: baseId + i,
      campaign_id: 0,
      email: o.email,
      event: "sent",
      provider_id: `auto_feedback_${reason}_${o.parent_id}`,
      created_at: new Date().toISOString(), // for real: queue with delayHours
      subject,
      // You could also stash metadata here (e.g., link): { feedback_url: FEEDBACK_URL }
    }));

    setLogs((prev) => [...entries, ...prev]);
    messageApi.success(`Feedback emails sent (simulated) — ${reason}, delay: ${delayHours}h`);
  };

  /* --------------------------------- forms --------------------------------- */
  const [templateForm] = Form.useForm();
  const [campaignForm] = Form.useForm();

  const saveTemplate = (values) => {
    const cleanText = values.body_text?.trim() ? values.body_text : stripHtml(values.body_html);

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, ...values, body_text: cleanText, updated_at: new Date().toISOString() }
            : t
        )
      );
      messageApi.success("Template updated");
    } else {
      const nextId = Math.max(0, ...templates.map((t) => t.id)) + 1;
      setTemplates((prev) => [
        ...prev,
        { id: nextId, created_by: 1, updated_at: new Date().toISOString(), ...values, body_text: cleanText },
      ]);
      messageApi.success("Template created");
    }
    setTemplateModalOpen(false);
  };

  const saveCampaign = (values) => {
    if (editingCampaign) {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === editingCampaign.id
            ? {
                ...c,
                ...values,
                scheduled_for: values.scheduled_for ? values.scheduled_for.toISOString() : null,
              }
            : c
        )
      );
      messageApi.success("Campaign updated");
    } else {
      const nextId = Math.max(0, ...campaigns.map((c) => c.id)) + 1;
      setCampaigns((prev) => [
        ...prev,
        {
          id: nextId,
          status: values.scheduled_for ? "scheduled" : "draft",
          sent_at: null,
          scheduled_for: values.scheduled_for ? values.scheduled_for.toISOString() : null,
          ...values,
        },
      ]);
      messageApi.success("Campaign created");
    }
    setCampaignModalOpen(false);
  };

  /* ------------------------------- columns --------------------------------- */
  const templateCols = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Name", dataIndex: "name" },
    { title: "Subject", dataIndex: "subject" },
    {
      title: "Category",
      dataIndex: "category",
      render: (v) => <Tag color="geekblue">{v || "general"}</Tag>,
      width: 130,
      filters: [
        { text: "General", value: "general" },
        { text: "Onboarding", value: "onboarding" },
        { text: "Report", value: "report" },
        { text: "Promotion", value: "promo" },
      ],
      onFilter: (val, rec) => rec.category === val,
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) => dayjs(a.updated_at).valueOf() - dayjs(b.updated_at).valueOf(),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      render: (_, r) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "preview", label: "Preview", icon: <EyeOutlined />, onClick: () => openPreview(r) },
              { key: "edit", label: "Edit", icon: <EditOutlined />, onClick: () => openEditTemplate(r) },
              { type: "divider" },
              {
                key: "delete",
                label: <span className="text-red-600">Delete</span>,
                icon: <DeleteOutlined />,
                onClick: () => deleteTemplate(r.id),
              },
            ],
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const campaignCols = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Name", dataIndex: "name" },
    {
      title: "Template",
      dataIndex: "template_id",
      render: (id) => tplById.get(id)?.name || `#${id}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (v) => <Tag color={colorByStatus(v)}>{v}</Tag>,
      filters: [
        { text: "Draft", value: "draft" },
        { text: "Scheduled", value: "scheduled" },
        { text: "Sent", value: "sent" },
      ],
      onFilter: (val, rec) => rec.status === val,
    },
    {
      title: "Scheduled For",
      dataIndex: "scheduled_for",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) => dayjs(a.scheduled_for || 0).valueOf() - dayjs(b.scheduled_for || 0).valueOf(),
    },
    {
      title: "Sent At",
      dataIndex: "sent_at",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) => dayjs(a.sent_at || 0).valueOf() - dayjs(b.sent_at || 0).valueOf(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_, r) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "edit", label: "Edit", icon: <EditOutlined />, onClick: () => openEditCampaign(r) },
              { key: "send", label: "Send Now", icon: <SendOutlined />, onClick: () => sendNow(r) },
              { key: "schedule", label: "Schedule", icon: <ScheduleOutlined />, onClick: () => scheduleCampaign(r) },
              { key: "test", label: "Test Send", icon: <ExperimentOutlined />, onClick: () => testSendCampaign(r) },
              { key: "dup", label: "Duplicate", icon: <CopyOutlined />, onClick: () => duplicateCampaign(r) },
              { type: "divider" },
              {
                key: "delete",
                label: <span className="text-red-600">Delete</span>,
                icon: <DeleteOutlined />,
                onClick: () => deleteCampaign(r.id),
              },
            ],
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const optinCols = [
    { title: "Parent ID", dataIndex: "parent_id", width: 110 },
    { title: "Email", dataIndex: "email" },
    {
      title: "Opted In",
      dataIndex: "opted_in",
      width: 160,
      render: (v, r) => (
        <Space>
          {v ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <ExclamationCircleTwoTone twoToneColor="#faad14" />}
          <Switch checked={v} onChange={(val) => toggleOptin(r.parent_id, val)} />
        </Space>
      ),
      filters: [
        { text: "Opted-in", value: true },
        { text: "Opted-out", value: false },
      ],
      onFilter: (v, rec) => rec.opted_in === v,
    },
    {
      title: "Confirmed",
      dataIndex: "confirmed_at",
      width: 190,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
  ];

  const logCols = [
    { title: "ID", dataIndex: "id", width: 90 },
    { title: "Campaign", dataIndex: "campaign_id", width: 110 },
    { title: "Email", dataIndex: "email" },
    {
      title: "Event",
      dataIndex: "event",
      width: 130,
      render: (v) => {
        const color = v === "sent" ? "blue" : v === "opened" ? "green" : v === "bounced" ? "red" : "default";
        return <Tag color={color}>{v}</Tag>;
      },
      filters: [
        { text: "Sent", value: "sent" },
        { text: "Opened", value: "opened" },
        { text: "Bounced", value: "bounced" },
      ],
      onFilter: (val, rec) => rec.event === val,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      width: 190,
      render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
      defaultSortOrder: "descend",
    },
  ];

  /* --------------------------------- render -------------------------------- */

  const reactCols = [
    { title: "User", dataIndex: "name", render: (v, r) => v || r.email },
    { title: "Email", dataIndex: "email" },
    {
      title: "Action",
      dataIndex: "action",
      render: (v) =>
        v === "award" ? <Tag color="green">Award</Tag> : v === "wait" ? <Tag color="orange">Wait</Tag> : <Tag>None</Tag>,
      width: 110,
    },
    { title: "Days", dataIndex: "days", width: 90, render: (v) => v ?? "—" },
    { title: "Reason", dataIndex: "reason" },
    {
      title: "Code (if sent)",
      dataIndex: "code",
      width: 220,
      render: (v) => (v ? <code>{v}</code> : "—"),
    },
  ];

  const awardedCount = reactResults.filter((r) => r.action === "award").length;
  const waitCount = reactResults.filter((r) => r.action === "wait").length;
  const noneCount = reactResults.filter((r) => r.action === "none").length;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Space align="baseline">
            <Title level={3} className="!mb-0">
              Newsletter & Automations
            </Title>
            <Tag icon={<SettingOutlined />} color="geekblue">
              Timing configurable
            </Tag>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button type="default" icon={<FileTextOutlined />} onClick={openCreateTemplate}>
              New Template
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateCampaign}>
              New Campaign
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Templates */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <MailOutlined />
                Templates
              </Space>
            }
            extra={<Tag color="purple">{templates.length} total</Tag>}
            hoverable
            className="rounded-2xl"
          >
            <Table
              rowKey="id"
              dataSource={templates}
              columns={templateCols}
              size="middle"
              pagination={{ pageSize: 5, showSizeChanger: true }}
            />
          </Card>
        </Col>

        {/* Campaigns */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SendOutlined />
                Campaigns
              </Space>
            }
            extra={
              <Space>
                <Tag color="blue">{campaigns.filter((c) => c.status === "scheduled").length} scheduled</Tag>
                <Tag color="green">{campaigns.filter((c) => c.status === "sent").length} sent</Tag>
              </Space>
            }
            hoverable
            className="rounded-2xl"
          >
            <Table
              rowKey="id"
              dataSource={campaigns}
              columns={campaignCols}
              size="middle"
              pagination={{ pageSize: 5, showSizeChanger: true }}
            />
          </Card>
        </Col>

        {/* Opt-in & Logs */}
        <Col xs={24} lg={10}>
          <Card
            title="Opt-in Status"
            extra={<Tag color="cyan">{optin.filter((o) => o.opted_in).length} subscribed</Tag>}
            hoverable
            className="rounded-2xl"
          >
            <Table
              rowKey="parent_id"
              dataSource={optin}
              columns={optinCols}
              size="small"
              pagination={{ pageSize: 6, showSizeChanger: true }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Email Logs" hoverable className="rounded-2xl">
            <Table
              rowKey="id"
              dataSource={logs}
              columns={logCols}
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: true }}
            />
          </Card>
        </Col>

        {/* Automations Config + Reactivation */}
        <Col xs={24}>
          <Card
            className="rounded-2xl"
            title={
              <Space>
                <SettingOutlined />
                Automations
              </Space>
            }
            extra={<Text type="secondary">Reactivation flow uses in-page data</Text>}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} lg={8}>
                <Card size="small" className="rounded-xl" title="After Paid Subscription">
                  <Space align="center" wrap>
                    <Text>Send feedback email after</Text>
                    <InputNumber
                      min={0}
                      value={automations.paid_feedback_delay_hours}
                      onChange={(v) =>
                        setAutomations((a) => ({ ...a, paid_feedback_delay_hours: Number(v || 0) }))
                      }
                    />
                    <Text>hour(s)</Text>
                    <Button
                      icon={<SendOutlined />}
                      onClick={() =>
                        sendFeedbackEmails("paid", automations.paid_feedback_delay_hours)
                      }
                    >
                      Simulate send
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Card size="small" className="rounded-xl" title="After Trial Ends (no conversion)">
                  <Space align="center" wrap>
                    <Text>Send feedback email after</Text>
                    <InputNumber
                      min={0}
                      value={automations.trial_ended_feedback_delay_hours}
                      onChange={(v) =>
                        setAutomations((a) => ({ ...a, trial_ended_feedback_delay_hours: Number(v || 0) }))
                      }
                    />
                    <Text>hour(s)</Text>
                    <Button
                      icon={<SendOutlined />}
                      onClick={() =>
                        sendFeedbackEmails("trial_ended", automations.trial_ended_feedback_delay_hours)
                      }
                    >
                      Simulate send
                    </Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card
                  size="small"
                  className="rounded-xl"
                  title={
                    <Space>
                      <RocketOutlined />
                      Reactivation Flow
                    </Space>
                  }
                  extra={<Tag color="geekblue">window: {reactWindowHours}h</Tag>}
                >
                  <ul className="m-0 pl-4 text-sm">
                    <li>Reply + Subscribe → no action</li>
                    <li>Reply, no subscribe after window → <strong>+5</strong> test days</li>
                    <li>No open or no feedback after window → <strong>+10</strong> test days</li>
                  </ul>
                  <div className="mt-3">
                    <Space wrap>
                      <InputNumber
                        min={1}
                        max={168}
                        value={reactWindowHours}
                        onChange={(v) => setReactWindowHours(Number(v || 48))}
                        addonBefore="Window (h)"
                      />
                      <Button icon={<EyeOutlined />} onClick={previewReactivation}>
                        Preview (Dry Run)
                      </Button>
                      <Button
                        type="primary"
                        icon={<GiftOutlined />}
                        loading={reactRunning}
                        onClick={runReactivation}
                      >
                        Run & Send Coupons
                      </Button>
                    </Space>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Template Modal */}
      <Modal
        title={editingTemplate ? "Edit Template" : "New Template"}
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        okText={editingTemplate ? "Save" : "Create"}
        onOk={() => templateForm.submit()}
        destroyOnClose
        width={820}
      >
        <Form
          key={editingTemplate ? editingTemplate.id : "new"}
          form={templateForm}
          layout="vertical"
          initialValues={
            editingTemplate || {
              name: "",
              subject: "",
              category: "general",
              body_html: "",
              body_text: "",
            }
          }
          onFinish={saveTemplate}
        >
          <Row gutter={12}>
            <Col xs={24} md={14}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input placeholder="Template name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="category" label="Category">
                <Select
                  options={[
                    { value: "general", label: "General" },
                    { value: "onboarding", label: "Onboarding" },
                    { value: "report", label: "Report" },
                    { value: "promo", label: "Promotion" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Email subject" />
          </Form.Item>

          <Form.Item
            name="body_html"
            label="Body (Rich Text / HTML)"
            rules={[{ required: true, message: "Body cannot be empty" }]}
            valuePropName="value"
            getValueFromEvent={(v) => v}
          >
            <QuillField />
          </Form.Item>

          <Form.Item
            name="body_text"
            label="Body (Plain Text – optional)"
            tooltip="If left empty, we’ll auto-generate from the HTML body."
          >
            <Input.TextArea rows={4} placeholder="Auto-generated from HTML if left blank" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Campaign Modal */}
      <Modal
        title={editingCampaign ? "Edit Campaign" : "New Campaign"}
        open={campaignModalOpen}
        onCancel={() => setCampaignModalOpen(false)}
        okText={editingCampaign ? "Save" : "Create"}
        onOk={() => campaignForm.submit()}
        destroyOnClose
        width={720}
      >
        <Form
          key={editingCampaign ? editingCampaign.id : "new"}
          form={campaignForm}
          layout="vertical"
          initialValues={
            editingCampaign
              ? {
                  ...editingCampaign,
                  scheduled_for: editingCampaign.scheduled_for ? dayjs(editingCampaign.scheduled_for) : null,
                }
              : { name: "", template_id: templates[0]?.id, scheduled_for: null }
          }
          onFinish={saveCampaign}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Back to School (BW, G2)" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="template_id" label="Template" rules={[{ required: true }]}>
                <Select options={templates.map((t) => ({ value: t.id, label: `${t.name} — ${t.subject}` }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduled_for" label="Schedule (optional)">
                <DatePicker showTime className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Segment (filters)</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="State">
                <Select value={stateFilter} onChange={setStateFilter} options={STATES.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Grade">
                <Select value={gradeFilter} onChange={setGradeFilter} options={GRADES.map((g) => ({ value: g, label: g }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Subscription">
                <Select
                  value={subscriptionFilter}
                  onChange={setSubscriptionFilter}
                  options={SUB_STATUS.map((g) => ({ value: g, label: g }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Paragraph type="secondary" className="mb-0">
            * These are UI filters for now; wire to your Segment builder later.
          </Paragraph>
        </Form>
      </Modal>

      {/* Preview Drawer */}
      <Drawer
        title={
          <Space>
            <EyeOutlined />
            Preview: {previewTemplate?.name}
          </Space>
        }
        placement="right"
        width={520}
        onClose={() => setPreviewOpen(false)}
        open={previewOpen}
      >
        {previewTemplate ? (
          <>
            <Text type="secondary">Subject</Text>
            <Card size="small" className="mb-3">
              {previewTemplate.subject}
            </Card>

            <Text type="secondary">HTML</Text>
            <Card size="small" className="mb-3">
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: previewTemplate.body_html || "<i>(empty)</i>" }}
              />
            </Card>

            <Text type="secondary">Text</Text>
            <Card size="small">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {previewTemplate.body_text || stripHtml(previewTemplate.body_html || "") || "(empty)"}
              </pre>
            </Card>
          </>
        ) : (
          <Empty description="No template selected." />
        )}
      </Drawer>

      {/* Reactivation Results Drawer */}
      <Drawer
        title={
          <Space>
            <GiftOutlined />
            Reactivation Results
          </Space>
        }
        placement="right"
        width={720}
        onClose={() => setReactDrawerOpen(false)}
        open={reactDrawerOpen}
      >
        <Space direction="vertical" size="middle" className="w-full">
          <Space wrap>
            <Tag color="green">Awards: {awardedCount}</Tag>
            <Tag color="orange">Wait: {waitCount}</Tag>
            <Tag>None: {noneCount}</Tag>
            <Tag color="geekblue">Window: {reactWindowHours}h</Tag>
          </Space>
          <Table
            rowKey={(r) => `${r.userId}-${r.email}`}
            columns={reactCols}
            dataSource={reactResults}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: true }}
          />
          <Text type="secondary">
            * “Run & Send” generates a code and adds a log entry here.
          </Text>
        </Space>
      </Drawer>
    </div>
  );
}

/* --------------------------------- Quill ---------------------------------- */
function QuillField({ value, onChange }) {
  const quillRef = useRef(null);

  const modules = {
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
    },
    clipboard: { matchVisual: false },
  };

  const formats = ["header", "bold", "italic", "underline", "list", "bullet", "align", "link"];

  return (
    <div className="antd-quill">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
      />
      <style>{`
        .antd-quill .ql-container { min-height: 200px; }
        .antd-quill .ql-toolbar, .antd-quill .ql-container { border-radius: 8px; }
      `}</style>
    </div>
  );
}
