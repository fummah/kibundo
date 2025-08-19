import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag,
  Drawer, Divider, Upload, Descriptions, List, Empty,
  Modal, Grid, Skeleton, Dropdown
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined,
  SaveOutlined, UploadOutlined, MoreOutlined
} from "@ant-design/icons";

import PageHeader from "@/components/PageHeader.jsx";
import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeDate, SafeTags, safe } from "@/utils/safe";

import { BUNDESLAENDER, GRADES, CURRICULUM_STATUSES } from "./_constants";
import {
  listCurricula,
  getCurriculum,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  publishCurriculum,
  listVersions,
  restoreVersion,
  searchQuizzes,
  linkQuizzes,
  unlinkQuiz,
} from "./_api";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { useBreakpoint } = Grid;

/** ---- Rich Text wrapper that plays nice with AntD Form ---- */
function RichTextArea({ value, onChange, onImageUpload }) {
  const quillRef = useRef(null);

  const handleImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const quill = quillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      try {
        const url = await onImageUpload(file); // must return a URL
        if (range) {
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1);
        }
      } catch (e) {
        // optionally show message.error(e.message)
        console.error(e);
      }
    };
    input.click();
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image", "blockquote", "code-block"],
          ["clean"],
        ],
        handlers: { image: handleImage },
      },
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = [
    "header", "bold", "italic", "underline", "strike",
    "color", "background", "list", "bullet", "align",
    "link", "image", "blockquote", "code-block",
  ];

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
        .antd-quill .ql-container { min-height: 160px; }
        .antd-quill .ql-toolbar, .antd-quill .ql-container { border-radius: 8px; }
      `}</style>
    </div>
  );
}

export default function Curricula() {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = Form.useWatch([], form);

  // QUIET fetching: swallow errors → return empty result
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["curricula", { page, pageSize, ...filters }],
    queryFn: async () => {
      try {
        return await listCurricula({ page, pageSize, ...filters });
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
  const [editId, setEditId] = useState(null);
  const [contentJson, setContentJson] = useState("{}");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const canWrite = true; // wire to RBAC if needed

  const openCreate = () => {
    setEditId(null);
    setContentJson("{}");
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const item = await getCurriculum(id);
      if (!item) return;
      setEditId(id);
      form.setFieldsValue({
        title: item.title || "",
        bundesland: item.bundesland || undefined,
        subject: item.subject || "",
        grade: item.grade || undefined,
        status: item.status || "draft",
        tags: item.tags || [],
        notes_html: item.notes_html || "",
      });
      setContentJson(JSON.stringify(item.content ?? {}, null, 2));
      setDrawerOpen(true);
    } catch {
      // stay quiet; keep UI as-is
    }
  };

  const createMut = useMutation({
    mutationFn: (payload) => createCurriculum(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); setDrawerOpen(false); },
    onError: () => {}
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateCurriculum(editId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); setDrawerOpen(false); },
    onError: () => {}
  });
  const del = useMutation({
    mutationFn: (id) => deleteCurriculum(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); },
    onError: () => {}
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishCurriculum(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); },
    onError: () => {}
  });

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this curriculum?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () =>
        del.mutate(id, {
          onSuccess: () => {
            if (detailId === id) setDetailId(null);
          }
        })
    });
  };

  const columns = useMemo(() => [
    { title: "Subject", dataIndex: "subject", ellipsis: true, render: (v) => <SafeText value={v} /> },
    { title: "Grade", dataIndex: "grade", width: 90, responsive: ["sm"], render: (v) => <SafeText value={v} /> },
    { title: "Bundesland", dataIndex: "bundesland", responsive: ["md"], render: (v) => <SafeText value={v} /> },
    { title: "Version", dataIndex: "version", width: 90, responsive: ["md"], render: (v) => <SafeText value={v} /> },
    {
      title: "Status", dataIndex: "status", width: 120,
      render: (s) =>
        s ? (
          <Tag color={s === "published" ? "green" : s === "review" ? "geekblue" : s === "archived" ? "volcano" : "default"}>
            {s}
          </Tag>
        ) : (
          <SafeText value={s} />
        )
    },
    { title: "Updated", dataIndex: "updated_at", responsive: ["lg"], render: (iso) => <SafeDate value={iso} /> },
    {
      title: "Actions",
      key: "actions",
      fixed: screens.md ? "right" : undefined,
      width: 80,
      render: (_, r) => {
        const isPublished = r.status === "published";
        const menu = {
          items: [
            { key: "view", label: "View" },
            { type: "divider" },
            ...(canWrite ? [{ key: "edit", label: "Edit" }] : []),
            ...(canWrite ? [{ key: "versions", label: "Versions" }] : []),
            ...(canWrite ? [{ key: "link", label: "Link Quizzes" }] : []),
            ...(canWrite ? [{ type: "divider" }] : []),
            ...(canWrite ? [{ key: "toggle", label: isPublished ? "Unpublish" : "Publish" }] : []),
            ...(canWrite ? [{ key: "delete", label: <span style={{ color: "#ff4d4f" }}>Delete</span> }] : []),
          ],
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            if (key === "view") {
              setDetailId(r.id);
            } else if (key === "edit") {
              openEdit(r.id);
            } else if (key === "versions") {
              setDetailId(r.id);
              setVersionsOpen(true);
            } else if (key === "link") {
              setDetailId(r.id);
              setLinkOpen(true);
            } else if (key === "toggle") {
              pub.mutate({ id: r.id, publish: !isPublished });
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

  const onExport = () => {
    const rows = (items ?? []).map((r) => ({
      id: safe(r.id), subject: safe(r.subject), grade: safe(r.grade),
      bundesland: safe(r.bundesland), version: safe(r.version),
      status: safe(r.status), updated_at: safe(r.updated_at)
    }));
    const header = "id,subject,grade,bundesland,version,status,updated_at";
    const body = rows.map(r => [r.id,r.subject,r.grade,r.bundesland,r.version,r.status,r.updated_at].join(",")).join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "curricula.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    let parsed = {};
    try { parsed = contentJson ? JSON.parse(contentJson) : {}; }
    catch { return; } // keep quiet if invalid JSON
    // include notes_html in payload (backend can ignore if unused)
    const payload = { ...values, content: parsed, notes_html: values?.notes_html || "" };
    if (editId) updateMut.mutate(payload); else createMut.mutate(payload);
  };

  const beforeUpload = async (file) => {
    const text = await file.text();
    try { JSON.parse(text); setContentJson(text); } catch { /* quiet */ }
    return false;
  };

  // Detail (quiet)
  const { data: detailData, refetch: refetchDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["curriculum", detailId],
    queryFn: async () => {
      try { return await getCurriculum(detailId); } catch { return null; }
    },
    enabled: !!detailId
  });
  const detail = detailData || null;
  useEffect(() => { if (detailId) refetchDetail(); }, [detailId, refetchDetail]);

  // simple example uploader for images inside rich editor (replace with real API)
  const uploadImage = async (file) => {
    // Example: upload to your server and return a URL
    // const formData = new FormData(); formData.append("file", file);
    // const { data } = await api.post("/upload", formData);
    // return data.url;
    await new Promise(r => setTimeout(r, 300));
    return URL.createObjectURL(file); // preview URL; replace in production
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Curricula"
        subtitle="Maintain curricula by state, subject, and grade. Link quizzes and manage versions."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Curriculum</Button>
          </Space>
        }
      />

      <ResponsiveFilters>
        <Form.Item name="q">
          <Input allowClear placeholder="Search title/subject/tags…" style={{ width: 260 }} />
        </Form.Item>
        <Form.Item name="bundesland" label="State">
          <Select allowClear options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} style={{ minWidth: 180 }} />
        </Form.Item>
        <Form.Item name="subject" label="Subject">
          <Input allowClear placeholder="e.g. Deutsch" style={{ minWidth: 160 }} />
        </Form.Item>
        <Form.Item name="grade" label="Grade">
          <Select allowClear options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} style={{ minWidth: 120 }} />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select allowClear options={CURRICULUM_STATUSES.map(s => ({ value: s, label: s }))} style={{ minWidth: 140 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button icon={<DownloadOutlined />} onClick={onExport}>Export CSV</Button>
          </Space>
        </Form.Item>
      </ResponsiveFilters>

      <div className="p-3 md:p-4">
        <Card bodyStyle={{ padding: 0 }} className="overflow-hidden">
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
            <div className="py-10">
              <Empty description="No curricula found">
                <Button type="primary" onClick={openCreate}>Create Curriculum</Button>
              </Empty>
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Edit Curriculum" : "New Curriculum"}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={createMut.isPending || updateMut.isPending} onClick={onSubmit}>
              {editId ? "Save" : "Create"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ status: "draft", grade: 1, notes_html: "" }}>
          <Form.Item name="title" label="Title"><Input placeholder="Optional title e.g. Deutsch – BW – Grade 2" /></Form.Item>
          <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true }]}>
            <Select options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input placeholder="e.g. Deutsch, Mathematik" /></Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true }]}><Select options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} /></Form.Item>
          <Form.Item name="status" label="Status"><Select options={CURRICULUM_STATUSES.map(s => ({ value: s, label: s }))} /></Form.Item>
          <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="press Enter to add" /></Form.Item>

          <Divider />

          {/* NEW: Rich Text Notes field */}
          <Form.Item name="notes_html" label="Notes (Rich Text)">
            <RichTextArea
              value={Form.useWatch("notes_html", form)}
              onChange={(html) => form.setFieldsValue({ notes_html: html })}
              onImageUpload={uploadImage}
            />
          </Form.Item>

          <Divider />

          <Form.Item label="Content (JSON / Blocks)">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Upload accept=".json,application/json" beforeUpload={beforeUpload} maxCount={1} showUploadList={false}>
                <Button icon={<UploadOutlined />}>Import JSON</Button>
              </Upload>
              <Input.TextArea
                rows={12}
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                placeholder='{"units":[{"title":"…","outcomes":[…]}]}'
              />
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Detail drawer */}
      <Drawer
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title="Curriculum"
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        extra={
          <Space>
            {canWrite && (
              <>
                <Button onClick={() => openEdit(detailId)}>Edit</Button>
                <Button onClick={() => setVersionsOpen(true)}>Versions</Button>
                <Button onClick={() => setLinkOpen(true)}>Link Quizzes</Button>
              </>
            )}
          </Space>
        }
      >
        {loadingDetail ? (
          <Skeleton active />
        ) : (
          <>
            <Descriptions column={1} size="middle" bordered>
              <Descriptions.Item label="Title"><SafeText value={detail?.title} /></Descriptions.Item>
              <Descriptions.Item label="Bundesland"><SafeText value={detail?.bundesland} /></Descriptions.Item>
              <Descriptions.Item label="Subject"><SafeText value={detail?.subject} /></Descriptions.Item>
              <Descriptions.Item label="Grade"><SafeText value={detail?.grade} /></Descriptions.Item>
              <Descriptions.Item label="Version"><SafeText value={detail?.version} /></Descriptions.Item>
              <Descriptions.Item label="Status">
                {detail?.status ? (
                  <Tag color={detail.status==="published"?"green":detail.status==="review"?"geekblue":detail.status==="archived"?"volcano":""}>
                    {detail.status}
                  </Tag>
                ) : <SafeText value={detail?.status} />}
              </Descriptions.Item>
              <Descriptions.Item label="Updated"><SafeDate value={detail?.updated_at} /></Descriptions.Item>
              <Descriptions.Item label="Created By"><SafeText value={detail?.created_by?.name} /></Descriptions.Item>
            </Descriptions>

            {/* Render the rich notes if present */}
            {detail?.notes_html ? (
              <>
                <Divider />
                <h3 className="font-semibold mb-2">Notes</h3>
                <div
                  className="prose max-w-none ql-editor"
                  // You already sanitize text elsewhere; if notes_html comes from trusted source, this is ok.
                  dangerouslySetInnerHTML={{ __html: detail.notes_html }}
                />
              </>
            ) : null}

            <Divider />
            <h3 className="font-semibold mb-2">Linked Quizzes</h3>
            {Array.isArray(detail?.quizzes) && detail.quizzes.length ? (
              <List
                dataSource={detail.quizzes}
                renderItem={(q) => (
                  <List.Item
                    actions={[
                      canWrite ? (
                        <Button danger size="small" onClick={async () => {
                          try { await unlinkQuiz(detail.id, q.id); } catch {}
                          refetchDetail();
                        }}>Unlink</Button>
                      ) : null
                    ]}
                  >
                    <List.Item.Meta
                      title={<SafeText value={q.title} />}
                      description={
                        <>
                          <SafeText value={q.subject} /> • Grade <SafeText value={q.grade} /> •{" "}
                          <SafeText value={q.bundesland} /> • <SafeTags value={q.tags} />
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : <Empty description="No quizzes linked yet" />}
          </>
        )}
      </Drawer>

      {/* Versions modal (quiet) */}
      <VersionsModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        curriculumId={detailId}
        afterRestore={() => { setVersionsOpen(false); refetch(); if (detailId) refetchDetail(); }}
      />

      {/* Link quizzes drawer (quiet) */}
      <LinkQuizzesDrawer
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        curriculum={detail}
        afterLink={() => { setLinkOpen(false); if (detailId) refetchDetail(); }}
      />
    </div>
  );
}

function VersionsModal({ open, onClose, curriculumId, afterRestore }) {
  const { data = [], isFetching } = useQuery({
    queryKey: ["curriculum-versions", curriculumId],
    queryFn: async () => {
      try { return await listVersions(curriculumId); } catch { return []; }
    },
    enabled: open && !!curriculumId
  });
  const qc = useQueryClient();

  const restore = useMutation({
    mutationFn: (versionId) => restoreVersion(curriculumId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curricula"] });
      if (afterRestore) afterRestore();
    },
    onError: () => {}
  });

  const columns = [
    { title: "Version", dataIndex: "version", width: 100, render: (v) => <SafeText value={v} /> },
    { title: "Status", dataIndex: "status", width: 120, render: (s) => <Tag><SafeText value={s} /></Tag> },
    { title: "Author", dataIndex: ["created_by","name"], render: (v) => <SafeText value={v} /> },
    { title: "Created", dataIndex: "created_at", render: (iso) => <SafeDate value={iso} /> },
    { title: "Notes", dataIndex: "diff_summary", render: (v) => <SafeText value={v} /> },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, r) => (
        <Button size="small" onClick={() => restore.mutate(r.id)} loading={restore.isPending}>
          Restore
        </Button>
      )
    }
  ];

  return (
    <Modal open={open} onCancel={onClose} title="Versions" footer={null} width={860}>
      <FluidTable rowKey="id" columns={columns} dataSource={data || []} loading={isFetching} pagination={false} />
    </Modal>
  );
}

function LinkQuizzesDrawer({ open, onClose, curriculum, afterLink }) {
  const [filters, setFilters] = useState({
    bundesland: curriculum?.bundesland || "",
    subject: curriculum?.subject || "",
    grade: curriculum?.grade || "",
    q: ""
  });
  const [selected, setSelected] = useState([]);

  useEffect(() => { if (open) setSelected([]); }, [open]);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["quiz-search", filters],
    queryFn: async () => {
      try { return await searchQuizzes(filters); } catch { return []; }
    },
    enabled: open && !!curriculum?.id
  });

  const link = useMutation({
    mutationFn: () => linkQuizzes(curriculum.id, selected),
    onSuccess: () => { if (afterLink) afterLink(); },
    onError: () => {}
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link Quizzes"
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
      extra={
        <Button type="primary" disabled={!selected.length} loading={link.isPending} onClick={() => link.mutate()}>
          Link {selected.length ? `(${selected.length})` : ""}
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <ResponsiveFilters>
          <Form.Item label="Bundesland">
            <Select
              placeholder="Any" style={{ minWidth: 180 }}
              allowClear value={filters.bundesland}
              onChange={(v) => setFilters(f => ({ ...f, bundesland: v }))}
              options={[{ value: "", label: "Any" }, ...BUNDESLAENDER.map(b => ({ value: b, label: b }))]}
            />
          </Form.Item>
          <Form.Item label="Subject">
            <Input
              placeholder="Subject" style={{ minWidth: 160 }}
              value={filters.subject}
              onChange={(e) => setFilters(f => ({ ...f, subject: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="Grade">
            <Select
              placeholder="Any" style={{ minWidth: 120 }}
              allowClear value={filters.grade}
              onChange={(v) => setFilters(f => ({ ...f, grade: v }))}
              options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))}
            />
          </Form.Item>
          <Form.Item label="Search">
            <Input
              placeholder="Title/tags" style={{ minWidth: 180 }}
              value={filters.q}
              onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
              onPressEnter={() => refetch()}
            />
          </Form.Item>
          <Form.Item>
            <Button onClick={() => refetch()} loading={isFetching}>Search</Button>
          </Form.Item>
        </ResponsiveFilters>

        <FluidTable
          rowKey="id"
          dataSource={data || []}
          loading={isFetching}
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
          columns={[
            { title: "Title", dataIndex: "title", ellipsis: true, render: (v) => <SafeText value={v} /> },
            { title: "Subject", dataIndex: "subject", width: 140, render: (v) => <SafeText value={v} /> },
            { title: "Grade", dataIndex: "grade", width: 100, render: (v) => <SafeText value={v} /> },
            { title: "Bundesland", dataIndex: "bundesland", width: 180, render: (v) => <SafeText value={v} /> },
            { title: "Tags", dataIndex: "tags", render: (tags) => <SafeTags value={tags} /> }
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Space>
    </Drawer>
  );
}
