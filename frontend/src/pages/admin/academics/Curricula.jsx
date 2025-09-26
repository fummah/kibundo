// src/pages/academics/Curricula.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Button, Card, Form, Input, Select, Space, Tag,
  Drawer, Divider, Descriptions, List, Empty,
  Modal, Grid, Skeleton, Dropdown,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined,
  SaveOutlined, MoreOutlined
} from "@ant-design/icons";

import ResponsiveFilters from "@/components/ResponsiveFilters.jsx";
import FluidTable from "@/components/FluidTable.jsx";
import { SafeText, SafeDate, SafeTags, safe } from "@/utils/safe";
import { useAuthContext } from "@/context/AuthContext.jsx";

import { BUNDESLAENDER, GRADES, CURRICULUM_STATUSES } from "./_constants";

/* 👉 API layer */
import {
  listCurricula,
  getCurriculum,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  publishCurriculum,
  listVersions,
  restoreVersion,
  searchGames, linkGames,
  searchReading, linkReading,
} from "@/api/academics/curricula";

import {
  searchQuizzes, linkQuizzes, unlinkQuiz,
} from "@/api/academics/quizzes";

import { searchWorksheets, linkWorksheets } from "@/api/academics/worksheets";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { useBreakpoint } = Grid;

/* ---------------- Rich Text wrapper (works with AntD Form) ---------------- */
function RichTextArea({ value, onChange, onImageUpload }) {
  const quillRef = useRef(null);
  const handleImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const quill = quillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      try {
        const url = await onImageUpload(file);
        if (range) {
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1);
        }
      } catch {}
    };
    input.click();
  };
  const modules = useMemo(() => ({
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
  }), []);
  const formats = [
    "header","bold","italic","underline","strike","color","background",
    "list","bullet","align","link","image","blockquote","code-block"
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

/* ================================== Page ================================== */
export default function Curricula() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const screens = useBreakpoint();
  const { user } = useAuthContext() || {};

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Watch all filter fields on this form
  const filters = Form.useWatch([], form);
  // Watch notes_html for editor binding (must be top-level to keep hooks order)
  const notesHtml = Form.useWatch("notes_html", form);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["curricula", { page, pageSize, ...filters }],
    queryFn: async () => {
      try { return await listCurricula({ page, pageSize, ...filters }); }
      catch { return { items: [], total: 0 }; }
    },
    keepPreviousData: true
  });

  const items = Array.isArray(data?.items)
    ? data.items.map((r) => ({ ...r, id: r?.id ?? r?._id }))
    : [];
  const total = Number.isFinite(data?.total) ? data.total : items.length;

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId,   setEditId]   = useState(null);
  // Removed JSON content editor
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  // Hidden content passthrough to satisfy backend JSONB NOT NULL
  const [content, setContent] = useState({});
  // Defer mount of rich text editor to avoid addRange() race when drawer opens
  const [showEditor, setShowEditor] = useState(false);

  const [linkQuizzesOpen, setLinkQuizzesOpen] = useState(false);
  const [linkWorksheetsOpen, setLinkWorksheetsOpen] = useState(false);
  const [linkGamesOpen, setLinkGamesOpen] = useState(false);
  const [linkReadingOpen, setLinkReadingOpen] = useState(false);

  const canWrite = true;

  const openCreate = () => {
    setEditId(null);
    form.resetFields();
    setContent({});
    setDrawerOpen(true);
    // mount editor after open
    setTimeout(() => setShowEditor(true), 0);
  };

  const openEdit = async (id) => {
    try {
      const item = await getCurriculum(id);
      if (!item) return;
      setEditId(item.id || id);
      setContent(item?.content ?? {});
      form.setFieldsValue({
        title: item.title || "",
        bundesland: item.bundesland || undefined,
        subject: item.subject || "",
        grade: item.grade || undefined,
        status: item.status || "draft",
        tags: item.tags || [],
        notes_html: item.notes_html || "",
      });
      setDrawerOpen(true);
      // mount editor after open
      setTimeout(() => setShowEditor(true), 0);
    } catch {}
  };

  const createMut = useMutation({
    mutationFn: async (payload) => {
      try {
        const hasToken = !!localStorage.getItem("token");
        console.log("[Curricula#createMut] mutationFn called", {
          keys: Object.keys(payload || {}),
          hasToken
        });
        if (!hasToken) {
          message.warning("No auth token found. Backend will likely return 401.");
        }
      } catch {}
      try {
        // Ensure required fields are present
        if (!payload.title) {
          throw new Error('Title is required');
        }
        if (!payload.subject) {
          throw new Error('Subject is required');
        }
        if (!payload.bundesland) {
          throw new Error('State (Bundesland) is required');
        }
        if (!payload.grade) {
          throw new Error('Grade is required');
        }
        
        // Add content and ensure it's not empty
        const curriculumData = {
          ...payload,
          content: Object.keys(content).length > 0 ? content : { sections: [] },
          created_by: user?.id,
          updated_by: user?.id,
        };
        
        return await createCurriculum(curriculumData);
      } catch (error) {
        console.error('Error creating curriculum:', error);
        throw error;
      }
    },
    onSuccess: () => {
      messageApi.success({
        content: 'Curriculum created successfully!',
        duration: 3,
      });
      qc.invalidateQueries({ queryKey: ["curricula"] });
      setDrawerOpen(false);
      form.resetFields();
      setContent({});
    },
    onError: (err) => {
      console.error('Error creating curriculum:', err);
      messageApi.error({
        content: err?.response?.data?.message || err?.message || "Failed to create curriculum. Please try again.",
        duration: 5,
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: async (payload) => {
      console.log("[Curricula#updateMut] mutationFn called", { keys: Object.keys(payload || {}) });
      try {
        if (!editId) throw new Error('No curriculum ID provided for update');
        
        const updateData = {
          ...payload,
          content: Object.keys(content).length > 0 ? content : { sections: [] },
          updated_by: user?.id,
        };
        
        return await updateCurriculum(editId, updateData);
      } catch (error) {
        console.error('Error updating curriculum:', error);
        throw error;
      }
    },
    onSuccess: () => {
      messageApi.success({
        content: 'Curriculum updated successfully!',
        duration: 3,
      });
      qc.invalidateQueries({ queryKey: ["curricula"] });
      setDrawerOpen(false);
    },
    onError: (err) => messageApi.error(
      err?.response?.data?.message || err?.message || "Failed to save curriculum"
    ),
  });
  const del = useMutation({
    mutationFn: (id) => deleteCurriculum(id),
    onSuccess: () => {
      messageApi.success("Curriculum deleted");
      qc.invalidateQueries({ queryKey: ["curricula"] });
    },
    onError: (err) => messageApi.error(
      err?.response?.data?.message || err?.message || "Failed to delete"
    ),
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }) => publishCurriculum(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); },
  });

  const confirmDelete = (id) => {
    Modal.confirm({
      title: "Delete this curriculum?",
      content: "This action cannot be undone.",
      okType: "danger",
      okText: "Delete",
      onOk: () => del.mutate(id, { onSuccess: () => { if (detailId === id) setDetailId(null); } })
    });
  };

  const getId = (r) => r?.id ?? r?._id;

  const columns = useMemo(() => [
    { title: "Subject", dataIndex: "subject", ellipsis: true, render: (v) => <SafeText value={v} /> },
    { title: "Grade", dataIndex: "grade", width: 90, responsive: ["sm"], render: (v) => <SafeText value={v} /> },
    { title: "Bundesland", dataIndex: "bundesland", responsive: ["md"], render: (v) => <SafeText value={v} /> },
    { title: "Version", dataIndex: "version", width: 90, responsive: ["md"], render: (v) => <SafeText value={v} /> },
    {
      title: "Status", dataIndex: "status", width: 120,
      render: (s) => s ? (
        <Tag color={s === "published" ? "green" : s === "review" ? "geekblue" : s === "archived" ? "volcano" : "default"}>{s}</Tag>
      ) : <SafeText value={s} />
    },
    { title: "Updated", dataIndex: "updated_at", responsive: ["lg"], render: (iso) => <SafeDate value={iso} /> },
    {
      title: "Actions",
      key: "actions",
      fixed: screens.md ? "right" : undefined,
      width: 110,
      render: (_, r) => {
        const isPublished = r.status === "published";
        const menu = {
          items: [
            { key: "view", label: "View" },
            { type: "divider" },
            ...(canWrite ? [{ key: "edit", label: "Edit" }] : []),
            ...(canWrite ? [{ key: "versions", label: "Versions" }] : []),
            ...(canWrite ? [
              { key: "link_quizzes", label: "Link Quizzes" },
              { key: "link_worksheets", label: "Link Worksheets" },
              { key: "link_games", label: "Link Games" },
              { key: "link_reading", label: "Link Reading" },
            ] : []),
            ...(canWrite ? [{ type: "divider" }] : []),
            ...(canWrite ? [{ key: "toggle", label: isPublished ? "Unpublish" : "Publish" }] : []),
            ...(canWrite ? [{ key: "delete", label: <span style={{ color: "#ff4d4f" }}>Delete</span> }] : []),
          ],
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            const id = getId(r);
            if (key === "view") setDetailId(id);
            else if (key === "edit") openEdit(id);
            else if (key === "versions") { setDetailId(id); setVersionsOpen(true); }
            else if (key === "link_quizzes") { setDetailId(id); setLinkQuizzesOpen(true); }
            else if (key === "link_worksheets") { setDetailId(id); setLinkWorksheetsOpen(true); }
            else if (key === "link_games") { setDetailId(id); setLinkGamesOpen(true); }
            else if (key === "link_reading") { setDetailId(id); setLinkReadingOpen(true); }
            else if (key === "toggle") pub.mutate({ id, publish: !isPublished });
            else if (key === "delete") confirmDelete(id);
          }
        };
        return (
          <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
            <Button size="small" type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        );
      }
    }
  // include reactive deps you reference
  ], [screens.md, pub, del, canWrite]);

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
    try {
      console.log('[Curricula#onSubmit] start');
      const values = await form.validateFields();
      console.log('[Curricula#onSubmit] after validateFields', { keys: Object.keys(values || {}) });
      const payload = {
        ...values,
        grade: values?.grade != null ? Number(values.grade) : undefined,
        content: Object.keys(content).length > 0 ? content : { sections: [] },
        status: values.status || 'draft',
        tags: Array.isArray(values?.tags) ? values.tags : [],
        notes_html: values?.notes_html || "",
        created_by: user?.id,
        updated_by: user?.id,
      };

      // Show loading state
      messageApi.loading({
        content: editId ? 'Saving curriculum...' : 'Creating curriculum...',
        key: 'saving',
        duration: 0
      });

      if (editId) {
        console.log('[Curricula#onSubmit] calling updateMut.mutateAsync');
        await updateMut.mutateAsync(payload);
        messageApi.success({
          content: 'Curriculum updated successfully!',
          key: 'saving',
          duration: 3
        });
      } else {
        console.log('[Curricula#onSubmit] calling createMut.mutateAsync');
        await createMut.mutateAsync(payload);
        messageApi.success({
          content: 'Curriculum created successfully!',
          key: 'saving',
          duration: 3
        });
      }

      // Invalidate queries and reset form
      qc.invalidateQueries({ queryKey: ["curricula"] });
      setDrawerOpen(false);
      form.resetFields();
      setContent({});
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (error.errorFields) {
        // Handle form validation errors
        messageApi.error({
          content: 'Please fill in all required fields',
          key: 'saving',
          duration: 3
        });
      } else {
        // Handle API errors
        messageApi.error({
          content: error.response?.data?.message || error.message || 'An error occurred. Please try again.',
          key: 'saving',
          duration: 5
        });
      }
    }
  };

  // Removed beforeUpload and JSON handling

  // Detail (quiet)
  const { data: detailData, refetch: refetchDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["curriculum", detailId],
    queryFn: async () => { try { return await getCurriculum(detailId); } catch { return null; } },
    enabled: !!detailId
  });
  const detail = detailData || null;
  useEffect(() => { if (detailId) refetchDetail(); }, [detailId, refetchDetail]);

  const uploadImage = async (file) => {
    await new Promise(r => setTimeout(r, 300));
    return URL.createObjectURL(file);
  };

  return (
    <div className="flex flex-col min-h-0">
      {contextHolder}
      <div className="p-4 bg-white rounded-lg shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Curriculum Management</h1>
            <p className="text-gray-500">Maintain curricula by state, subject, and grade</p>
          </div>
          <Space wrap>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => refetch()}
              className="flex items-center"
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openCreate}
              className="flex items-center"
            >
              New Curriculum
            </Button>
          </Space>
        </div>

      {/* Wrap filter items in a real Form so Form.useWatch works */}
      <Form form={form} layout="inline">
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
      </Form>

      <div className="p-3 md:p-4">
        <Card styles={{ body: { padding: 0 } }} className="overflow-hidden">
          <FluidTable
            rowKey={(r) => r?.id ?? r?._id}
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
              <Empty description="No curricula found" />
            </div>
          )}
        </Card>
      </div>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setShowEditor(false); setDrawerOpen(false); }}
        title={editId ? "Edit Curriculum" : "New Curriculum"}
        width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
        destroyOnClose
        footer={
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setShowEditor(false); setDrawerOpen(false); }}>Close</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={(createMut.isPending ?? createMut.isLoading) || (updateMut.isPending ?? updateMut.isLoading)}
                disabled={(createMut.isPending ?? createMut.isLoading) || (updateMut.isPending ?? updateMut.isLoading)}
                onClick={onSubmit}
              >
                {editId ? "Save" : "Add"}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ status: "draft", grade: 1, notes_html: "" }} scrollToFirstError={false}>
          <Form.Item name="title" label="Title"><Input placeholder="Optional title e.g. Deutsch – BW – Grade 2" /></Form.Item>
          <Form.Item name="bundesland" label="Bundesland" rules={[{ required: true, message: "Please select a state (Bundesland)" }]}>
            <Select options={BUNDESLAENDER.map(b => ({ value: b, label: b }))} />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Please enter a subject" }]}><Input placeholder="e.g. Deutsch, Mathematik" /></Form.Item>
          <Form.Item name="grade" label="Grade" rules={[{ required: true, message: "Please select a grade" }]}><Select options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} /></Form.Item>
          <Form.Item name="status" label="Status"><Select options={CURRICULUM_STATUSES.map(s => ({ value: s, label: s }))} /></Form.Item>
          <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="press Enter to add" /></Form.Item>

          <Divider />

          <Form.Item name="notes_html" label="Notes (Rich Text)">
            {drawerOpen && showEditor ? (
              <RichTextArea
                value={notesHtml}
                onChange={(html) => form.setFieldsValue({ notes_html: html })}
                onImageUpload={uploadImage}
              />
            ) : null}
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
                <Button onClick={() => setLinkQuizzesOpen(true)}>Link Quizzes</Button>
                <Button onClick={() => setLinkWorksheetsOpen(true)}>Link Worksheets</Button>
                <Button onClick={() => setLinkGamesOpen(true)}>Link Games</Button>
                <Button onClick={() => setLinkReadingOpen(true)}>Link Reading</Button>
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

            {detail?.notes_html ? (
              <>
                <Divider />
                <h3 className="font-semibold mb-2">Notes</h3>
                <div className="prose max-w-none ql-editor" dangerouslySetInnerHTML={{ __html: detail.notes_html }} />
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
                      description={<>
                        <SafeText value={q.subject} /> • Grade <SafeText value={q.grade} /> •{" "}
                        <SafeText value={q.bundesland} /> • <SafeTags value={q.tags} />
                      </>}
                    />
                  </List.Item>
                )}
              />
            ) : <Empty description="No quizzes linked yet" />}

            <Divider />

            <h3 className="font-semibold mb-2">Linked Worksheets</h3>
            {Array.isArray(detail?.worksheets) && detail.worksheets.length ? (
              <List
                dataSource={detail.worksheets}
                renderItem={(w) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<SafeText value={w.title} />}
                      description={<>
                        <SafeText value={w.subject} /> • Grade <SafeText value={w.grade} /> •{" "}
                        <SafeText value={w.bundesland} /> • <SafeTags value={w.tags} />
                      </>}
                    />
                  </List.Item>
                )}
              />
            ) : <Empty description="No worksheets linked yet" />}

            <Divider />

            <h3 className="font-semibold mb-2">Linked Games</h3>
            {Array.isArray(detail?.games) && detail.games.length ? (
              <List dataSource={detail.games} renderItem={(g) => (<List.Item><SafeText value={g.title} /></List.Item>)} />
            ) : <Empty description="No games linked yet" />}

            <Divider />

            <h3 className="font-semibold mb-2">Linked Reading</h3>
            {Array.isArray(detail?.reading) && detail.reading.length ? (
              <List dataSource={detail.reading} renderItem={(r) => (<List.Item><SafeText value={r.title} /></List.Item>)} />
            ) : <Empty description="No reading linked yet" />}
          </>
        )}
      </Drawer>

      {/* Versions Modal */}
      <VersionsModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        curriculumId={detailId}
        afterRestore={() => { setVersionsOpen(false); refetch(); if (detailId) refetchDetail(); }}
      />

      {/* Link drawers */}
      <LinkQuizzesDrawer
        open={linkQuizzesOpen}
        onClose={() => setLinkQuizzesOpen(false)}
        curriculum={detail}
        afterLink={() => { setLinkQuizzesOpen(false); if (detailId) refetchDetail(); }}
      />
      <LinkWorksheetsDrawer
        open={linkWorksheetsOpen}
        onClose={() => setLinkWorksheetsOpen(false)}
        curriculum={detail}
        afterLink={() => { setLinkWorksheetsOpen(false); if (detailId) refetchDetail(); }}
      />
      <LinkGamesDrawer
        open={linkGamesOpen}
        onClose={() => setLinkGamesOpen(false)}
        curriculum={detail}
        afterLink={() => { setLinkGamesOpen(false); if (detailId) refetchDetail(); }}
      />
      <LinkReadingDrawer
        open={linkReadingOpen}
        onClose={() => setLinkReadingOpen(false)}
        curriculum={detail}
        afterLink={() => { setLinkReadingOpen(false); if (detailId) refetchDetail(); }}
      />
    </div>
  );
}

/* ================================ Helpers ================================ */
function VersionsModal({ open, onClose, curriculumId, afterRestore }) {
  const { data = [], isFetching } = useQuery({
    queryKey: ["curriculum-versions", curriculumId],
    queryFn: async () => { try { return await listVersions(curriculumId); } catch { return []; } },
    enabled: open && !!curriculumId
  });
  const qc = useQueryClient();
  const restore = useMutation({
    mutationFn: (versionId) => restoreVersion(curriculumId, versionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curricula"] }); afterRestore?.(); }
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
        <Button size="small" onClick={() => restore.mutate(r.id)} loading={restore.isPending ?? restore.isLoading}>
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

/* -------------------------- Link drawers (4x) --------------------------- */
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
    queryFn: async () => { try { return await searchQuizzes(filters); } catch { return []; } },
    enabled: open && !!curriculum?.id
  });

  const link = useMutation({
    mutationFn: () => linkQuizzes(curriculum.id, selected),
    onSuccess: () => { afterLink?.(); }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link Quizzes"
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
      extra={<Button type="primary" disabled={!selected.length} loading={link.isPending ?? link.isLoading} onClick={() => link.mutate()}>Link {selected.length ? `(${selected.length})` : ""}</Button>}
    >
      <SearchFilters filters={filters} setFilters={setFilters} refetch={refetch} isFetching={isFetching} />
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
    </Drawer>
  );
}

function LinkWorksheetsDrawer({ open, onClose, curriculum, afterLink }) {
  const [filters, setFilters] = useState({
    bundesland: curriculum?.bundesland || "",
    subject: curriculum?.subject || "",
    grade: curriculum?.grade || "",
    q: ""
  });
  const [selected, setSelected] = useState([]);
  useEffect(() => { if (open) setSelected([]); }, [open]);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["worksheet-search", filters],
    queryFn: async () => { try { return await searchWorksheets(filters); } catch { return []; } },
    enabled: open && !!curriculum?.id
  });

  const link = useMutation({
    mutationFn: () => linkWorksheets(curriculum.id, selected),
    onSuccess: () => { afterLink?.(); }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link Worksheets"
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
      extra={<Button type="primary" disabled={!selected.length} loading={link.isPending ?? link.isLoading} onClick={() => link.mutate()}>Link {selected.length ? `(${selected.length})` : ""}</Button>}
    >
      <SearchFilters filters={filters} setFilters={setFilters} refetch={refetch} isFetching={isFetching} />
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
    </Drawer>
  );
}

function LinkGamesDrawer({ open, onClose, curriculum, afterLink }) {
  const [selected, setSelected] = useState([]);
  useEffect(() => { if (open) setSelected([]); }, [open]);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["games-search", curriculum?.id],
    queryFn: async () => { try { return await searchGames({}); } catch { return []; } },
    enabled: open && !!curriculum?.id
  });

  const link = useMutation({
    mutationFn: () => linkGames(curriculum.id, selected),
    onSuccess: () => { afterLink?.(); }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link Games (stub)"
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
      extra={<Button type="primary" disabled={!selected.length} loading={link.isPending ?? link.isLoading} onClick={() => link.mutate()}>Link {selected.length ? `(${selected.length})` : ""}</Button>}
    >
      <p className="text-gray-500 mb-3">Search returns empty for now; this is a placeholder so UI compiles.</p>
      <FluidTable
        rowKey="id"
        dataSource={data || []}
        loading={isFetching}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        columns={[
          { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
        ]}
        pagination={{ pageSize: 10 }}
      />
      <Button onClick={() => refetch()}>Refresh</Button>
    </Drawer>
  );
}

function LinkReadingDrawer({ open, onClose, curriculum, afterLink }) {
  const [selected, setSelected] = useState([]);
  useEffect(() => { if (open) setSelected([]); }, [open]);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["reading-search", curriculum?.id],
    queryFn: async () => { try { return await searchReading({}); } catch { return []; } },
    enabled: open && !!curriculum?.id
  });

  const link = useMutation({
    mutationFn: () => linkReading(curriculum.id, selected),
    onSuccess: () => { afterLink?.(); }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link Reading (stub)"
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 32 : 720)}
      extra={<Button type="primary" disabled={!selected.length} loading={link.isPending ?? link.isLoading} onClick={() => link.mutate()}>Link {selected.length ? `(${selected.length})` : ""}</Button>}
    >
      <p className="text-gray-500 mb-3">Search returns empty for now; this is a placeholder so UI compiles.</p>
      <FluidTable
        rowKey="id"
        dataSource={data || []}
        loading={isFetching}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        columns={[
          { title: "Title", dataIndex: "title", render: (v) => <SafeText value={v} /> },
        ]}
        pagination={{ pageSize: 10 }}
      />
      <Button onClick={() => refetch()}>Refresh</Button>
    </Drawer>
  );
}

/* ------------- common small filter strip used in link drawers ------------- */
function SearchFilters({ filters, setFilters, refetch, isFetching }) {
  return (
    <Form layout="inline"> {/* ensure items have a Form context */}
      <ResponsiveFilters>
        <Form.Item label="Bundesland">
          <Select
            placeholder="Any" style={{ minWidth: 180 }}
            allowClear value={filters.bundesland}
            onChange={(v) => setFilters(f => ({ ...f, bundesland: v || "" }))}
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
            onChange={(v) => setFilters(f => ({ ...f, grade: v || "" }))}
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
    </Form>
  );
}
