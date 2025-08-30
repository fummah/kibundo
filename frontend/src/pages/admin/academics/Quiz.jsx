// src/pages/academics/Quiz.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Drawer, Divider,
  Grid, Dropdown, Modal, Descriptions, Tabs, InputNumber, Tooltip
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, MoreOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CopyOutlined, DeleteOutlined, EyeOutlined
} from "@ant-design/icons";
import { BUNDESLAENDER, GRADES } from "./_constants";
import { listQuizzes, createQuiz, updateQuiz, deleteQuiz, publishQuiz } from "./_api";
import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags, safe, safeJoin } from "@/utils/safe";

/* 🧠 Rich text editor */
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { useBreakpoint } = Grid;

/* ---------------- helpers ---------------- */
const qTypes = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "short", label: "Short Answer" },
  { value: "true_false", label: "True / False" },
];

const newQuestion = (type = "mcq") => {
  if (type === "mcq") {
    return {
      type,
      prompt: "",       // HTML string from Quill
      points: 1,
      choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      answerIndex: 0,
      tags: [],
    };
  }
  if (type === "short") {
    return { type, prompt: "", points: 1, answerText: "", tags: [] };
  }
  return { type: "true_false", prompt: "", points: 1, answerBool: true, tags: [] };
};

/* A tiny wrapper to keep Quill consistent inside forms */
const RichText = ({ value, onChange, placeholder }) => {
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "blockquote", "code-block"],
      ["clean"],
    ],
  };
  const formats = [
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "list", "bullet",
    "link", "blockquote", "code-block",
  ];
  return (
    <div className="richtext">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style>{`
        .richtext .ql-container {
          min-height: 140px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .richtext .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default function Quiz() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["quizzes", { page, pageSize, ...filters }],
    queryFn: async () => {
      try {
        return await listQuizzes({ page, pageSize, ...filters });
      } catch {
        return { items: [], total: 0 };
      }
    },
    keepPreviousData: true
  });

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number.isFinite(data?.total) ? data.total : items.length;

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState("details");
  const [editId, setEditId] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  const createMut = useMutation({
    mutationFn: (payload) => createQuiz(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateQuiz(editId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setDrawerOpen(false); }
  });
  const del = useMutation({
    mutationFn: (id) => deleteQuiz(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); }
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishQuiz(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); }
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      status: "draft",
      difficulty: "easy",
      grade: 1,
      objectives: [],
      description: "", // HTML
      items: [],       // question array
    });
    setActiveDrawerTab("details");
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    editForm.setFieldsValue({
      title: r.title,
      description: r.description || "", // rich text HTML
      tags: r.tags || [],
      subject: r.subject,
      grade: r.grade,
      bundesland: r.bundesland,
      difficulty: r.difficulty || "medium",
      objectives: r.objectives || [],
      status: r.status || "draft",
      items: Array.isArray(r.items) ? r.items : (Array.isArray(r.questions) ? r.questions : []),
    });
    setActiveDrawerTab("details");
    setDrawerOpen(true);
  };

  const onSubmit = async () => {
    const values = await editForm.validateFields();
    const payload = {
      ...values,
      // values.description is HTML
      // each items[i].prompt is HTML
    };
    if (editId) updateMut.mutate(payload); else createMut.mutate(payload);
  };

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this quiz?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () =>
        del.mutate(id, {
          onSuccess: () => {
            if (viewRec?.id === id) setViewOpen(false);
          }
        })
    });
  };

  /* ---------------- columns ---------------- */
  const columns = useMemo(() => [
    { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
    { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
    { title: "Grade", dataIndex: "grade", width: 90, render: (v) => <SafeText value={v} /> },
    { title: "State", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
    {
      title: "Difficulty", dataIndex: "difficulty", width: 120,
      render: (d) => (
        <Tag color={d === "easy" ? "green" : d === "hard" ? "volcano" : "geekblue"}>
          <SafeText value={d} />
        </Tag>
      )
    },
    {
      title: "Items", dataIndex: "items", width: 90,
      render: (arr, r) => <SafeText value={Array.isArray(arr) ? arr.length : (Array.isArray(r?.questions) ? r.questions.length : 0)} />
    },
    {
      title: "Status", dataIndex: "status", width: 120,
      render: (s) => (
        <Tag color={s === "live" ? "green" : s === "review" ? "geekblue" : "default"}>
          <SafeText value={s} />
        </Tag>
      )
    },
    { title: "Tags", dataIndex: "tags", render: (tags) => <SafeTags value={tags} /> },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: screens.md ? "right" : undefined,
      render: (_, r) => {
        const isLive = r.status === "live";
        const menu = {
          items: [
            { key: "view", label: "View" },
            { type: "divider" },
            { key: "edit", label: "Edit" },
            { key: "toggle", label: isLive ? "Unpublish" : "Publish (live)" },
            { key: "delete", label: <span style={{ color: "#ff4d4f" }}>Delete</span> },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            if (key === "view") {
              setViewRec(r); setViewOpen(true);
            } else if (key === "edit") {
              openEdit(r);
            } else if (key === "toggle") {
              pub.mutate({ id: r.id, publish: !isLive });
            } else if (key === "delete") {
              confirmDelete(r.id);
            }
          }
        };
        return (
          <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              aria-label="More actions"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      }
    }
  ], [screens.md, pub.isPending, del.isPending]);

  /* ---------------- export ---------------- */
  const onExport = () => {
    const rows = (items ?? []).map(q => ({
      id: safe(q.id), title: safe(q.title), subject: safe(q.subject),
      grade: safe(q.grade), bundesland: safe(q.bundesland),
      difficulty: safe(q.difficulty), status: safe(q.status),
      tags: safeJoin(q.tags, "|"),
      items_count: Array.isArray(q.items) ? q.items.length : (Array.isArray(q.questions) ? q.questions.length : 0)
    }));
    const header = "id,title,subject,grade,bundesland,difficulty,status,tags,items_count";
    const csv = [header, ...rows.map(r => [r.id,r.title,r.subject,r.grade,r.bundesland,r.difficulty,r.status,r.tags,r.items_count].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "quizzes.csv"; a.click(); URL.revokeObjectURL(url);
  };

  /* ---------------- editor helpers ---------------- */
  const swapItems = (list, i, j) => {
    const a = [...list];
    const t = a[i]; a[i] = a[j]; a[j] = t;
    return a;
  };
  const duplicateItem = (list, i) => {
    const a = [...list];
    a.splice(i + 1, 0, JSON.parse(JSON.stringify(a[i] || {})));
    return a;
  };
  const setItems = (next) => editForm.setFieldsValue({ items: next });
  const addQuestionOfType = (type) => {
    const curr = editForm.getFieldValue("items") || [];
    setItems([...(curr || []), newQuestion(type)]);
    setActiveDrawerTab("editor");
  };

  const QuestionEditor = () => {
    const values = editForm.getFieldValue("items") || [];
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-8 items-center">
          <div className="text-sm text-gray-500">
            {values?.length || 0} item{(values?.length || 0) === 1 ? "" : "s"}
          </div>
          <Space wrap>
            {qTypes.map((t) => (
              <Button key={t.value} onClick={() => addQuestionOfType(t.value)} icon={<PlusOutlined />}>
                Add {t.label}
              </Button>
            ))}
          </Space>
        </div>

        <Form.List name="items">
          {(fields, { remove }) => (
            <div className="space-y-12">
              {fields.map(({ key, name, ...rest }, idx) => {
                const t = editForm.getFieldValue(["items", name, "type"]) || "mcq";
                const moveUp = () => {
                  const curr = editForm.getFieldValue("items") || [];
                  if (idx <= 0) return;
                  setItems(swapItems(curr, idx, idx - 1));
                };
                const moveDown = () => {
                  const curr = editForm.getFieldValue("items") || [];
                  if (idx >= curr.length - 1) return;
                  setItems(swapItems(curr, idx, idx + 1));
                };
                const duplicate = () => {
                  const curr = editForm.getFieldValue("items") || [];
                  setItems(duplicateItem(curr, idx));
                };

                return (
                  <Card
                    key={key}
                    type="inner"
                    title={
                      <Space wrap>
                        <Tag color="blue">{t === "mcq" ? "MCQ" : t === "short" ? "Short" : "True/False"}</Tag>
                        <span className="font-medium">Question {idx + 1}</span>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Tooltip title="Preview">
                          <Button icon={<EyeOutlined />} size="small"
                            onClick={() => {
                              Modal.info({
                                title: "Preview",
                                content: renderPreview(editForm.getFieldValue(["items", name])),
                              });
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Move up"><Button icon={<ArrowUpOutlined />} size="small" onClick={moveUp} /></Tooltip>
                        <Tooltip title="Move down"><Button icon={<ArrowDownOutlined />} size="small" onClick={moveDown} /></Tooltip>
                        <Tooltip title="Duplicate"><Button icon={<CopyOutlined />} size="small" onClick={duplicate} /></Tooltip>
                        <Tooltip title="Remove"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => remove(name)} /></Tooltip>
                      </Space>
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-12">
                      <div className="sm:col-span-3">
                        {/* 🔥 Rich Text Prompt */}
                        <Form.Item
                          {...rest}
                          name={[name, "prompt"]}
                          label="Prompt"
                          rules={[{ required: true, message: "Enter a question prompt" }]}
                          valuePropName="value"
                          getValueFromEvent={(v) => v}
                        >
                          <RichText placeholder="Type the question… (supports headings, lists, code, etc.)" />
                        </Form.Item>

                        {t === "mcq" && (
                          <>
                            <Form.List name={[name, "choices"]}>
                              {(choiceFields, choiceOps) => (
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500">Choices</div>
                                  {choiceFields.map((cf) => (
                                    <div key={cf.key} className="flex items-center gap-2">
                                      <Form.Item
                                        className="flex-1 !mb-0"
                                        name={[cf.name, "text"]}
                                        rules={[{ required: true, message: "Choice text required" }]}
                                      >
                                        <Input placeholder={`Choice ${cf.name + 1}`} />
                                      </Form.Item>
                                      <Button size="small" onClick={() => choiceOps.add({ text: "" }, cf.name + 1)}>+</Button>
                                      <Button size="small" onClick={() => choiceOps.remove(cf.name)} danger>-</Button>
                                    </div>
                                  ))}
                                  {choiceFields.length === 0 && (
                                    <Button onClick={() => choiceOps.add({ text: "" })} size="small">
                                      Add a choice
                                    </Button>
                                  )}
                                </div>
                              )}
                            </Form.List>

                            <Form.Item
                              name={[name, "answerIndex"]}
                              label="Correct Choice (0-based index)"
                              rules={[{ type: "number", transform: (v) => Number(v), required: true }]}
                            >
                              <InputNumber min={0} />
                            </Form.Item>
                          </>
                        )}

                        {t === "short" && (
                          <Form.Item name={[name, "answerText"]} label="Expected Answer">
                            <Input placeholder="Reference answer (optional)" />
                          </Form.Item>
                        )}

                        {t === "true_false" && (
                          <Form.Item name={[name, "answerBool"]} label="Correct Answer" initialValue>
                            <Select
                              options={[
                                { value: true, label: "True" },
                                { value: false, label: "False" },
                              ]}
                            />
                          </Form.Item>
                        )}
                      </div>

                      <div className="sm:col-span-1">
                        <Form.Item name={[name, "type"]} label="Type" rules={[{ required: true }]}>
                          <Select options={qTypes} />
                        </Form.Item>
                        <Form.Item name={[name, "points"]} label="Points" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name={[name, "tags"]} label="Tags">
                          <Select mode="tags" placeholder="Add tags" />
                        </Form.Item>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Form.List>
      </div>
    );
  };

  const renderPreview = (q) => {
    if (!q) return <div>-</div>;
    if (q.type === "mcq") {
      return (
        <div>
          <div
            className="font-medium mb-2"
            dangerouslySetInnerHTML={{ __html: q.prompt || "" }}
          />
          <ol className="list-decimal pl-5">
            {(q.choices || []).map((c, i) => (
              <li key={i} className={i === Number(q.answerIndex) ? "font-semibold" : ""}>
                <SafeText value={c?.text} />
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if (q.type === "short") {
      return (
        <div>
          <div
            className="font-medium mb-2"
            dangerouslySetInnerHTML={{ __html: q.prompt || "" }}
          />
          <div className="text-gray-500">Answer: <SafeText value={q.answerText || "—"} /></div>
        </div>
      );
    }
    return (
      <div>
        <div
          className="font-medium mb-2"
          dangerouslySetInnerHTML={{ __html: q.prompt || "" }}
        />
        <div className="text-gray-500">Answer: {String(q.answerBool ?? true)}</div>
      </div>
    );
  };

  /* ---------------- render ---------------- */
  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Quizzes"
        subtitle="Create, edit and publish quizzes. Use the rich-text editor to build questions."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Quiz</Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form form={form} component={false} />
        <Form.Item name="q"><Input placeholder="Search title/tags…" allowClear style={{ width: 260 }} /></Form.Item>
        <Form.Item name="bundesland" label="State">
          <Select allowClear options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} style={{ minWidth: 180 }} />
        </Form.Item>
        <Form.Item name="subject" label="Subject"><Input allowClear style={{ minWidth: 160 }} /></Form.Item>
        <Form.Item name="grade" label="Grade">
          <Select allowClear options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} style={{ minWidth: 120 }} />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select allowClear options={["draft","review","live"].map(s => ({ value: s, label: s }))} style={{ minWidth: 120 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
          </Space>
        </Form.Item>
      </ResponsiveFilters>

      <div className="p-3 md:p-4">
        <Card bodyStyle={{ padding: 0 }}>
          <FluidTable
            rowKey="id"
            loading={isFetching}
            columns={columns}
            dataSource={items}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); }
            }}
          />
          {!isFetching && items.length === 0 && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
              No quizzes yet — create one to get started.
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Drawer with Rich Text + Editor */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Quiz" : "New Quiz"}
        width={Math.min(900, typeof window !== "undefined" ? window.innerWidth - 32 : 900)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={createMut.isPending || updateMut.isPending}
              onClick={onSubmit}
            >
              {editId ? "Save" : "Create"}
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeDrawerTab}
          onChange={setActiveDrawerTab}
          items={[
            {
              key: "details",
              label: "Details",
              children: (
                <Form
                  layout="vertical"
                  form={editForm}
                  initialValues={{ status: "draft", difficulty: "easy", grade: 1, objectives: [], items: [] }}
                >
                  <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>

                  {/* 🔥 Rich Text Description */}
                  <Form.Item
                    name="description"
                    label="Description"
                    valuePropName="value"
                    getValueFromEvent={(v) => v}
                  >
                    <RichText placeholder="Describe the quiz (instructions, context, etc.)" />
                  </Form.Item>

                  <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true }]}>
                    <Select options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} />
                  </Form.Item>
                  <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
                    <Select options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} />
                  </Form.Item>
                  <Form.Item name="difficulty" label="Difficulty">
                    <Select options={["easy","medium","hard"].map(d => ({ value: d, label: d }))} />
                  </Form.Item>
                  <Form.Item name="objectives" label="Learning Goals"><Select mode="tags" placeholder="Add goals (Enter)" /></Form.Item>
                  <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Add tags (Enter)" /></Form.Item>
                  <Divider />
                  <Form.Item name="status" label="Status">
                    <Select options={["draft","review","live"].map(s => ({ value: s, label: s }))} />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "editor",
              label: "Editor",
              children: (
                <Form form={editForm} layout="vertical" component={false}>
                  <QuestionEditor />
                </Form>
              ),
            },
          ]}
        />
      </Drawer>

      {/* View Drawer */}
      <Drawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Quiz"
        width={Math.min(680, typeof window !== "undefined" ? window.innerWidth - 32 : 680)}
        extra={
          viewRec ? (
            <Space>
              <Button onClick={() => { setViewOpen(false); openEdit(viewRec); }}>Edit</Button>
              <Button onClick={() => pub.mutate({ id: viewRec.id, publish: viewRec.status !== "live" })}>
                {viewRec.status === "live" ? "Unpublish" : "Publish"}
              </Button>
              <Button danger onClick={() => confirmDelete(viewRec.id)}>Delete</Button>
            </Space>
          ) : null
        }
      >
        {viewRec ? (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Title"><SafeText value={viewRec.title} /></Descriptions.Item>
            <Descriptions.Item label="Bundesland"><SafeText value={viewRec.bundesland} /></Descriptions.Item>
            <Descriptions.Item label="Subject"><SafeText value={viewRec.subject} /></Descriptions.Item>
            <Descriptions.Item label="Grade"><SafeText value={viewRec.grade} /></Descriptions.Item>
            <Descriptions.Item label="Difficulty">
              <Tag color={viewRec.difficulty === "easy" ? "green" : viewRec.difficulty === "hard" ? "volcano" : "geekblue"}>
                <SafeText value={viewRec.difficulty} />
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={viewRec.status === "live" ? "green" : viewRec.status === "review" ? "geekblue" : "default"}>
                <SafeText value={viewRec.status} />
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tags"><SafeTags value={viewRec.tags} /></Descriptions.Item>

            {/* 🔎 Render rich text description */}
            <Descriptions.Item label="Description">
              <div dangerouslySetInnerHTML={{ __html: viewRec.description || "" }} />
            </Descriptions.Item>

            <Descriptions.Item label="Items">
              <div className="space-y-4">
                {(viewRec.items || viewRec.questions || []).map((q, i) => (
                  <Card key={i} size="small" title={`Q${i + 1} • ${q.type}`}>
                    {/* preview renders prompt as HTML */}
                    {renderPreview(q)}
                  </Card>
                ))}
              </div>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );
}
