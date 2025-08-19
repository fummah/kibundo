// src/pages/newsletter/Newsletter.jsx
import { useMemo, useState } from "react";
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
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

/* -------------------------------------------------------------------------- */
/*                                   MOCKS                                    */
/* -------------------------------------------------------------------------- */

// Segment filter placeholders
const STATES = ["All", "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"];
const GRADES = ["All", "1", "2", "3", "4", "5", "6"];
const SUB_STATUS = ["All", "active", "past_due", "canceled"];

// Templates
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

// Campaigns
const DUMMY_CAMPAIGNS = [
  { id: 101, name: "Back to School (BW, G2)", template_id: 1, status: "draft", scheduled_for: null, sent_at: null },
  { id: 102, name: "Monthly Summary – June", template_id: 2, status: "scheduled", scheduled_for: dayjs().add(2, "day").toISOString(), sent_at: null },
  { id: 103, name: "Onboarding Wave A", template_id: 1, status: "sent", scheduled_for: null, sent_at: dayjs().subtract(7, "day").toISOString() },
];

// Opt-ins
const DUMMY_OPTIN = [
  { parent_id: 1, email: "tina@example.com", opted_in: true, confirmed_at: dayjs().subtract(10, "day").toISOString() },
  { parent_id: 2, email: "omar@example.com", opted_in: false, confirmed_at: null },
  { parent_id: 3, email: "li@example.com", opted_in: true, confirmed_at: dayjs().subtract(3, "day").toISOString() },
];

// Logs
const DUMMY_LOGS = Array.from({ length: 18 }).map((_, i) => ({
  id: 3000 + i,
  campaign_id: 103,
  email: `parent${i + 1}@mail.com`,
  event: i % 5 === 0 ? "bounced" : i % 4 === 0 ? "opened" : "sent",
  provider_id: `mock_${103}_${i}`,
  created_at: dayjs().subtract(i, "hour").toISOString(),
}));

/* -------------------------------------------------------------------------- */
/*                                    UI                                      */
/* -------------------------------------------------------------------------- */

export default function Newsletter() {
  /* ------------------------------ local state ------------------------------ */
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

  const colorByStatus = (s) =>
    s === "sent" ? "green" : s === "scheduled" ? "blue" : "default";

  const tplById = useMemo(() => {
    const m = new Map();
    templates.forEach((t) => m.set(t.id, t));
    return m;
  }, [templates]);

  /* ------------------------------- handlers -------------------------------- */

  // Template create/edit/delete/preview
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
        message.success("Template deleted");
      },
    });
  };
  const openPreview = (record) => {
    setPreviewTemplate(record);
    setPreviewOpen(true);
  };

  // Campaigns create/edit/send/schedule/delete
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
    message.success(`Campaign "${record.name}" sent to ${newLogs.length} recipients`);
  };
  const scheduleCampaign = (record) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === record.id ? { ...c, status: "scheduled", scheduled_for: dayjs().add(1, "day").toISOString() } : c
      )
    );
    message.success(`Campaign "${record.name}" scheduled for tomorrow`);
  };
  const deleteCampaign = (id) => {
    Modal.confirm({
      title: "Delete campaign?",
      okButtonProps: { danger: true },
      onOk: () => {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        message.success("Campaign deleted");
      },
    });
  };

  // Opt-in toggle (demo)
  const toggleOptin = (parent_id, val) => {
    setOptin((prev) => prev.map((o) => (o.parent_id === parent_id ? { ...o, opted_in: val } : o)));
  };

  /* --------------------------------- forms --------------------------------- */
  const [templateForm] = Form.useForm();
  const [campaignForm] = Form.useForm();

  const saveTemplate = (values) => {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...values, updated_at: new Date().toISOString() } : t))
      );
      message.success("Template updated");
    } else {
      const nextId = Math.max(0, ...templates.map((t) => t.id)) + 1;
      setTemplates((prev) => [
        ...prev,
        { id: nextId, created_by: 1, updated_at: new Date().toISOString(), ...values },
      ]);
      message.success("Template created");
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
      message.success("Campaign updated");
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
      message.success("Campaign created");
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
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
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
    },
    {
      title: "Sent At",
      dataIndex: "sent_at",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_, r) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "edit", label: "Edit", icon: <EditOutlined />, onClick: () => openEditCampaign(r) },
              { key: "send", label: "Send Now", icon: <SendOutlined />, onClick: () => sendNow(r) },
              { key: "schedule", label: "Schedule", icon: <ScheduleOutlined />, onClick: () => scheduleCampaign(r) },
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

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={3} className="!mb-0">
            Newsletter & Automations
          </Title>
         
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
          >
            <Table
              rowKey="id"
              dataSource={templates}
              columns={templateCols}
              size="middle"
              pagination={{ pageSize: 5 }}
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
          >
            <Table
              rowKey="id"
              dataSource={campaigns}
              columns={campaignCols}
              size="middle"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>

        {/* Opt-in & Logs */}
        <Col xs={24} lg={10}>
          <Card
            title="Opt-in Status"
            extra={<Tag color="cyan">{optin.filter((o) => o.opted_in).length} subscribed</Tag>}
            hoverable
          >
            <Table
              rowKey="parent_id"
              dataSource={optin}
              columns={optinCols}
              size="small"
              pagination={{ pageSize: 6 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Email Logs" hoverable>
            <Table
              rowKey="id"
              dataSource={logs}
              columns={logCols}
              size="small"
              pagination={{ pageSize: 8 }}
            />
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
        width={720}
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
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Template name" />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Email subject" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
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
          <Form.Item name="body_html" label="Body (HTML)">
            <Input.TextArea rows={6} placeholder="<h1>Hello</h1>" />
          </Form.Item>
          <Form.Item name="body_text" label="Body (Text)">
            <Input.TextArea rows={4} placeholder="Hello" />
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
          <Paragraph type="secondary">
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
                {previewTemplate.body_text || "(empty)"}
              </pre>
            </Card>
          </>
        ) : (
          <Text type="secondary">No template selected.</Text>
        )}
      </Drawer>
    </div>
  );
}
