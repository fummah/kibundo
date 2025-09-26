// src/pages/academics/Quiz.jsx
import React, { useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag, Drawer, Divider,
  Grid, Dropdown, Modal, Descriptions, Tabs, InputNumber, Tooltip, message
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, MoreOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CopyOutlined, DeleteOutlined, EyeOutlined
} from "@ant-design/icons";
import { BUNDESLAENDER, GRADES } from "./_constants";
import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeTags, safe, safeJoin } from "@/utils/safe";

/* ✅ Use your real API module */
import {
  listQuizzes,   // ({ page, pageSize, ...filters }) -> { items, total }
  createQuiz,    // payload; if payload.id exists, backend updates
  deleteQuiz,    // (id)
} from "@/api/academics/quizzes.js";

/* Rich text */
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
      prompt: "",  // HTML from Quill
      points: 1,
      choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      answerIndex: 0,
      tags: [],
    };
  }
  if (type === "short") return { type, prompt: "", points: 1, answerText: "", tags: [] };
  return { type: "true_false", prompt: "", points: 1, answerBool: true, tags: [] };
};

/* ---- item transforms (internal <-> API) ---- */
const fromApiItem = (it = {}) => {
  const t = String(it.type || "").toLowerCase();
  if (t === "multiple-choice" || t === "multiple_choice") {
    const options = Array.isArray(it.options) ? it.options : [];
    const answerStr = Array.isArray(it.answer_key) ? it.answer_key[0] : undefined;
    const answerIndex = Math.max(0, options.findIndex((o) => String(o) === String(answerStr)));
    return {
      type: "mcq",
      prompt: it.prompt || "",
      points: Number(it.points) || 1,
      choices: options.map((o) => ({ text: String(o ?? "") })),
      answerIndex: answerIndex >= 0 ? answerIndex : 0,
      tags: [],
    };
  }
  if (t === "true-false" || t === "true_false") {
    const answerStr = Array.isArray(it.answer_key) ? it.answer_key[0] : "true";
    return {
      type: "true_false",
      prompt: it.prompt || "",
      points: Number(it.points) || 1,
      answerBool: String(answerStr).toLowerCase() === "true",
      tags: [],
    };
  }
  const ans = Array.isArray(it.answer_key) ? it.answer_key[0] : "";
  return { type: "short", prompt: it.prompt || "", points: Number(it.points) || 1, answerText: ans ?? "", tags: [] };
};

const toApiItem = (q = {}, idx = 0) => {
  const base = {
    prompt: q.prompt || "",
    hints: Array.isArray(q.hints) ? q.hints : [],
    position: Number(idx) + 1,
    points: Number(q.points) || 1,
  };
  if (q.type === "mcq") {
    const options = (q.choices || []).map((c) => c?.text ?? "");
    const i = Math.max(0, Math.min(options.length - 1, Number(q.answerIndex) || 0));
    const answer = options[i] ?? "";
    return { ...base, type: "multiple-choice", options, answer_key: [answer] };
  }
  if (q.type === "true_false") {
    return { ...base, type: "true-false", options: ["true", "false"], answer_key: [q.answerBool ? "true" : "false"] };
  }
  return { ...base, type: "short-answer", options: [], answer_key: q.answerText ? [String(q.answerText)] : [""] };
};

/* ----------- Stable, controlled Quill (no debounce, no internal mirror) ----------- */
const RichText = React.memo(function RichText({ value, onChange, placeholder }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "blockquote", "code-block"],
        ["clean"],
      ],
      history: { delay: 500, maxStack: 200, userOnly: true },
    }),
    []
  );

  const formats = useMemo(
    () => [
      "header",
      "bold", "italic", "underline", "strike",
      "color", "background",
      "list", "bullet",
      "link", "blockquote", "code-block",
    ],
    []
  );

  return (
    <div className="richtext">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={(html, _delta, source) => {
          if (source === "user") onChange?.(html);
        }}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        bounds=".richtext"
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
        .richtext .ql-editor { word-break: break-word; overflow-wrap: anywhere; }
      `}</style>
    </div>
  );
});

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
    keepPreviousData: true,
  });

  const rows = Array.isArray(data?.items) ? data.items : [];
  const total = Number.isFinite(data?.total) ? data.total : rows.length;

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState("details");
  const [editId, setEditId] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  // Visible columns (toggle via dropdown)
  const [visibleCols, setVisibleCols] = useState({
    id: true,
    title: true,
    subject: true,
    grade: true,
    bundesland: true,
    difficulty: true,
    items: true,
    status: true,
    tags: true,
    actions: true,
  });
  const toggleCol = (k) => setVisibleCols((p) => ({ ...p, [k]: !p[k] }));

  /* Mutations backed by your quizzes.js API */
  const saveMut = useMutation({
    mutationFn: (payload) => createQuiz(payload), // works for create & update if payload.id exists
    onSuccess: (_data, vars) => {
      message.success(vars?.id ? "Quiz updated successfully" : "Quiz created successfully");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      setDrawerOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err?.message || "Failed to save quiz");
    }
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteQuiz(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
  const publishMut = useMutation({
    mutationFn: ({ id, publish }) => createQuiz({ id, status: publish ? "live" : "draft" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  const openCreate = () => {
    setEditId(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      status: "draft",
      difficulty: "easy",
      grade: 1,
      objectives: [],
      description: "",
      items: [],
    });
    setActiveDrawerTab("details");
    setDrawerOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    const rawItems = Array.isArray(r.items) ? r.items : Array.isArray(r.questions) ? r.questions : [];
    editForm.setFieldsValue({
      title: r.title,
      description: r.description || "",
      tags: r.tags || [],
      subject: r.subject,
      grade: r.grade,
      bundesland: r.bundesland,
      difficulty: r.difficulty || "medium",
      objectives: r.objectives || [],
      status: r.status || "draft",
      items: rawItems.map(fromApiItem), // normalize for editor
    });
    setActiveDrawerTab("details");
    setDrawerOpen(true);
  };

  const onSubmit = async () => {
    const values = await editForm.validateFields();
    const editorItems = Array.isArray(values.items) ? values.items : [];
    const payload = {
      ...values,
      items: editorItems.map(toApiItem), // convert to API shape
      ...(editId ? { id: editId } : {}),
    };
    saveMut.mutate(payload);
  };

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this quiz?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () =>
        delMut.mutate(id, {
          onSuccess: () => {
            if (viewRec?.id === id) setViewOpen(false);
          },
        }),
    });
  };

  /* ---------------- columns ---------------- */
  const columnDefs = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 160, render: (v) => <SafeText value={v} /> },
      { title: "Title", dataIndex: "title", key: "title", render: (v) => <SafeText value={v} /> },
      { title: "Subject", dataIndex: "subject", key: "subject", width: 140, render: (v) => <SafeText value={v} /> },
      { title: "Grade", dataIndex: "grade", key: "grade", width: 90, render: (v) => <SafeText value={v} /> },
      { title: "State", dataIndex: "bundesland", key: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
      {
        title: "Difficulty",
        dataIndex: "difficulty",
        key: "difficulty",
        width: 120,
        render: (d) => (
          <Tag color={d === "easy" ? "green" : d === "hard" ? "volcano" : "geekblue"}>
            <SafeText value={d} />
          </Tag>
        ),
      },
      {
        title: "Items",
        dataIndex: "items",
        key: "items",
        width: 90,
        render: (arr, r) => (
          <SafeText
            value={
              Array.isArray(arr) ? arr.length : Array.isArray(r?.questions) ? r.questions.length : 0
            }
          />
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) => (
          <Tag color={s === "live" ? "green" : s === "review" ? "geekblue" : "default"}>
            <SafeText value={s} />
          </Tag>
        ),
      },
      { title: "Tags", dataIndex: "tags", key: "tags", render: (tags) => <SafeTags value={tags} /> },
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
                setViewRec(r);
                setViewOpen(true);
              } else if (key === "edit") {
                openEdit(r);
              } else if (key === "toggle") {
                publishMut.mutate({ id: r.id, publish: !isLive });
              } else if (key === "delete") {
                confirmDelete(r.id);
              }
            },
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
        },
      },
    ],
    [screens.md, publishMut.isPending, delMut.isPending]
  );

  // Filter columns by visibility
  const columns = useMemo(() => {
    return columnDefs.filter((c) => {
      const key = c.key || c.dataIndex;
      return key && visibleCols[key] !== false;
    });
  }, [columnDefs, visibleCols]);

  // Show/Hide columns dropdown items
  const columnLabels = {
    id: "ID",
    title: "Title",
    subject: "Subject",
    grade: "Grade",
    bundesland: "State",
    difficulty: "Difficulty",
    items: "Items",
    status: "Status",
    tags: "Tags",
    actions: "Actions",
  };

  const columnMenuItems = Object.keys(visibleCols).map((k) => ({
    key: k,
    label: (
      <div onClick={(e) => e.stopPropagation()}>
        <label style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!visibleCols[k]}
            onChange={() => toggleCol(k)}
            style={{ marginRight: 8 }}
          />
          {columnLabels[k] || k}
        </label>
      </div>
    ),
  }));

  /* ---------------- export ---------------- */
  const onExport = () => {
    const out = (rows ?? []).map((q) => ({
      id: safe(q.id),
      title: safe(q.title),
      subject: safe(q.subject),
      grade: safe(q.grade),
      bundesland: safe(q.bundesland),
      difficulty: safe(q.difficulty),
      status: safe(q.status),
      tags: safeJoin(q.tags, "|"),
      items_count: Array.isArray(q.items)
        ? q.items.length
        : Array.isArray(q.questions)
        ? q.questions.length
        : 0,
    }));
    const header = "id,title,subject,grade,bundesland,difficulty,status,tags,items_count";
    const csv = [header, ...out.map((r) => [r.id,r.title,r.subject,r.grade,r.bundesland,r.difficulty,r.status,r.tags,r.items_count].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quizzes.csv"; a.click(); URL.revokeObjectURL(url);
  };

  /* ---------------- editor helpers ---------------- */
  const swapItems = (list, i, j) => { const a = [...list]; const t = a[i]; a[i] = a[j]; a[j] = t; return a; };
  const duplicateItem = (list, i) => { const a = [...list]; a.splice(i + 1, 0, JSON.parse(JSON.stringify(a[i] || {}))); return a; };
  const setItems = (next) => editForm.setFieldsValue({ items: next });
  const addQuestionOfType = (type) => {
    const curr = editForm.getFieldValue("items") || [];
    setItems([...(curr || []), newQuestion(type)]);
    setActiveDrawerTab("editor");
  };

  const renderPreview = (q) => {
    if (!q) return <div>-</div>;
    if (q.type === "mcq") {
      return (
        <div>
          <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
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
          <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
          <div className="text-gray-500">Answer: <SafeText value={q.answerText || "—"} /></div>
        </div>
      );
    }
    return (
      <div>
        <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
        <div className="text-gray-500">Answer: {String(q.answerBool ?? true)}</div>
      </div>
    );
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
                const moveUp = () => { const curr = editForm.getFieldValue("items") || []; if (idx > 0) setItems(swapItems(curr, idx, idx - 1)); };
                const moveDown = () => { const curr = editForm.getFieldValue("items") || []; if (idx < curr.length - 1) setItems(swapItems(curr, idx, idx + 1)); };
                const duplicate = () => { const curr = editForm.getFieldValue("items") || []; setItems(duplicateItem(curr, idx)); };

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
                          <Button
                            icon={<EyeOutlined />}
                            size="small"
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
                        {/* Rich text prompt (stable controlled) */}
                        <Form.Item
                          {...rest}
                          name={[name, "prompt"]}
                          label="Prompt"
                          rules={[{ required: true, message: "Enter a question prompt" }]}
                          valuePropName="value"
                          getValueFromEvent={(v) => v}
                          trigger="onChange"
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
                          <Form.Item name={[name, "answerBool"]} label="Correct Answer">
                            <Select options={[{ value: true, label: "True" }, { value: false, label: "False" }]} />
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

  /* ---------------- render ---------------- */
  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Quizzes"
        subtitle="Create, edit and publish quizzes. Use the rich-text editor to build questions."
        extra={
          <Space wrap>
            <Dropdown menu={{ items: columnMenuItems }} trigger={["click"]}>
              <Button>Columns</Button>
            </Dropdown>
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
        <Card styles={{ body: { padding: 0 } }}>
          <FluidTable
            rowKey="id"
            loading={isFetching}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); }
            }}
          />
          {!isFetching && rows.length === 0 && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
              No quizzes yet — create one to get started.
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Quiz" : "New Quiz"}
        width={Math.min(900, typeof window !== "undefined" ? window.innerWidth - 32 : 900)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMut.isPending}
              onClick={onSubmit}
            >
              {editId ? "Save" : "Create"}
            </Button>
          </div>
        }
      >
        <Tabs
          activeKey={activeDrawerTab}
          onChange={setActiveDrawerTab}
          destroyInactiveTabPane={false}  // keep Quill mounted
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

                  <Form.Item
                    name="description"
                    label="Description"
                    valuePropName="value"
                    getValueFromEvent={(v) => v}
                    trigger="onChange"
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
              <Button onClick={() => publishMut.mutate({ id: viewRec.id, publish: viewRec.status !== "live" })}>
                {viewRec.status === "live" ? "Unpublish" : "Publish"}
              </Button>
              <Button danger onClick={() => confirmDelete(viewRec.id)}>Delete</Button>
            </Space>
          ) : null
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </div>
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

            {/* rich text description */}
            <Descriptions.Item label="Description">
              <div dangerouslySetInnerHTML={{ __html: viewRec.description || "" }} />
            </Descriptions.Item>

            <Descriptions.Item label="Items">
              <div className="space-y-4">
                {(viewRec.items || viewRec.questions || []).map((raw, i) => {
                  const q = raw && typeof raw.type === "string" && raw.type.includes("multiple")
                    ? fromApiItem(raw)
                    : raw;
                  return (
                    <Card key={i} size="small" title={`Q${i + 1} • ${q.type}`}>
                      <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
                      {q.type === "mcq" ? (
                        <ol className="list-decimal pl-5">
                          {(q.choices || []).map((c, idx) => (
                            <li key={idx} className={idx === Number(q.answerIndex) ? "font-semibold" : ""}>
                              <SafeText value={c?.text} />
                            </li>
                          ))}
                        </ol>
                      ) : q.type === "short" ? (
                        <div className="text-gray-500">Answer: <SafeText value={q.answerText || "—"} /></div>
                      ) : (
                        <div className="text-gray-500">Answer: {String(q.answerBool ?? true)}</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );
}
