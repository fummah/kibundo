import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Card, DatePicker, Dropdown, Input, Modal, Select, Space, Table, Tag, Typography, message
} from "antd";
import {
  BookOutlined, EllipsisOutlined, EyeOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, UserSwitchOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import api from "@/api/axios";
import SubjectForm from "./SubjectForm.jsx";
import AssignSubjectModal from "./AssignSubjectModal.jsx";
import { useAuthContext } from "@/context/AuthContext";

const { RangePicker } = DatePicker;

/** Helpers */
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
const withinRange = (iso, range) => {
  if (!range || range.length !== 2) return true;
  const ts = new Date(iso).getTime();
  const start = range[0]?.startOf?.("day")?.toDate?.() ?? range[0];
  const end = range[1]?.endOf?.("day")?.toDate?.() ?? range[1];
  return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
};

export default function SubjectsList() {
  const { user } = useAuthContext();
  const currentUserId = user?.id ?? user?.user_id ?? user?.userId;

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState();
  const [dateRange, setDateRange] = useState();

  // View modal
  const [viewer, setViewer] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState(null);

  const loadClasses = async () => {
    try {
      const { data } = await api.get("/allclasses");
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load classes.");
    }
  };

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/allsubjects");
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  const classLabel = (cls) =>
    cls?.name || cls?.class_name || cls?.title || (cls?.id ? `Class #${cls.id}` : "—");

  const classNameFromId = (cid) => {
    const cls = classes.find((c) => String(c.id) === String(cid));
    return classLabel(cls);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    setModalOpen(true);
  };

  const onDelete = (rec) => {
    Modal.confirm({
      title: `Delete subject #${rec.id}?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/subject/${rec.id}`);
          message.success("Subject deleted.");
          loadSubjects();
        } catch {
          message.error("Delete failed.");
        }
      },
    });
  };

  const onView = async (rec) => {
    setViewerLoading(true);
    try {
      const { data } = await api.get(`/subject/${rec.id}`);
      setViewer(data || rec);
    } catch {
      setViewer(rec);
    } finally {
      setViewerLoading(false);
    }
  };

  const openAssign = (rec) => {
    setAssignSubjectId(rec.id);
    setAssignOpen(true);
  };

  const filtered = useMemo(() => {
    return subjects.filter((r) => {
      const text = `${r.subject_name ?? ""} ${classNameFromId(r.class_id)}`.toLowerCase();
      const textMatch = !q || text.includes(q.toLowerCase());
      const classMatch = !classFilter || String(r.class_id) === String(classFilter);
      const dateMatch = !r.created_at || withinRange(r.created_at, dateRange);
      return textMatch && classMatch && dateMatch;
    });
  }, [subjects, q, classFilter, dateRange, classes]);

  const columns = useMemo(
    () => [
      {
        title: "Subject",
        dataIndex: "subject_name",
        render: (_, rec) => (
          <div className="leading-tight">
            <div className="font-medium flex items-center gap-2">
              <BookOutlined /> {rec.subject_name}
            </div>
            <div className="text-xs text-gray-500">
              ID: <Tag>{rec.id}</Tag>
            </div>
          </div>
        ),
      },
      {
        title: "Class",
        dataIndex: "class_id",
        render: (cid, rec) =>
          rec.class ? classLabel(rec.class) : classNameFromId(cid),
        width: 220,
      },
      {
        title: "Created By",
        dataIndex: "created_by",
        width: 140,
        render: (v, rec) => rec.userCreated?.name || rec.userCreated?.fullName || v || "—",
      },
      {
        title: "Created At",
        dataIndex: "created_at",
        width: 200,
        render: (d) => fmt(d),
      },
      {
        title: "",
        key: "actions",
        align: "right",
        width: 60,
        render: (_, rec) => {
          const items = [
            { key: "view", icon: <EyeOutlined />, label: "View", onClick: () => onView(rec) },
            { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => openEdit(rec) },
            { key: "assign", icon: <UserSwitchOutlined />, label: "Assign", onClick: () => openAssign(rec) },
            { key: "delete", icon: <DeleteOutlined />, label: <span className="text-red-600">Delete</span>, onClick: () => onDelete(rec) },
          ];
          return (
            <Dropdown trigger={["click"]} placement="bottomRight" arrow menu={{ items }}>
              <Button type="text" shape="circle" aria-label="Actions" icon={<EllipsisOutlined />} />
            </Dropdown>
          );
        },
      },
    ],
    [classes]
  );

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
          <BookOutlined /> Subjects
        </Typography.Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Subject
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by subject or class…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 320 }}
              allowClear
            />
            <Select
              placeholder="Filter by class"
              value={classFilter}
              onChange={setClassFilter}
              allowClear
              options={classes.map((c) => ({ value: c.id, label: classLabel(c) }))}
              style={{ width: 260 }}
              showSearch
              optionFilterProp="label"
            />
            <RangePicker value={dateRange} onChange={setDateRange} />
          </Space>

          <Space>
            <Button onClick={() => { setQ(""); setClassFilter(undefined); setDateRange(undefined); }}>
              Reset
            </Button>
          </Space>
        </div>

        <div className="mt-4">
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </Card>

      {/* VIEW MODAL */}
      <Modal
        open={!!viewer}
        title={viewer ? `Subject #${viewer.id}` : ""}
        confirmLoading={viewerLoading}
        footer={
          viewer && (
            <Space>
              <Link to={`/admin/academics/subjects/${viewer.id}`}>
                <Button type="default">Open Detail Page</Button>
              </Link>
              <Button onClick={() => setViewer(null)}>Close</Button>
            </Space>
          )
        }
        onCancel={() => setViewer(null)}
        width={720}
      >
        {viewer && !viewerLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card size="small" title="Overview">
              <div className="space-y-1 text-sm">
                <div><strong>Subject:</strong> {viewer.subject_name}</div>
                <div><strong>Class:</strong> {viewer.class ? (viewer.class.name || viewer.class.class_name || `Class #${viewer.class.id}`) : classNameFromId(viewer.class_id)}</div>
                <div><strong>Created By:</strong> {viewer.userCreated?.name || viewer.created_by || "—"}</div>
                <div><strong>Created At:</strong> {fmt(viewer.created_at)}</div>
              </div>
            </Card>
            <Card size="small" title="Quick Actions">
              <Space direction="vertical">
                <Button icon={<UserSwitchOutlined />} onClick={() => { setViewer(null); openAssign(viewer); }}>Assign</Button>
                <Button icon={<EditOutlined />} onClick={() => { setViewer(null); openEdit(viewer); }}>Edit</Button>
                <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(viewer)}>Delete</Button>
              </Space>
            </Card>
          </div>
        )}
      </Modal>

      {/* CREATE/EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={editing ? `Edit Subject #${editing.id}` : "Add Subject"}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        footer={null}
        destroyOnClose
      >
        <SubjectForm
          classes={classes}
          initialValues={editing ? {
            subject_name: editing.subject_name,
            class_id: editing.class_id,
            created_by: editing.created_by,
          } : {}}
          onSubmit={async (vals) => {
            try {
              const payload = editing
                ? { id: editing.id, subject_name: vals.subject_name, class_id: Number(vals.class_id), created_by: editing.created_by ?? currentUserId }
                : { subject_name: vals.subject_name, class_id: Number(vals.class_id), created_by: currentUserId };

              await api.post("/addsubject", payload);
              message.success(editing ? "Subject updated." : "Subject added.");
              setModalOpen(false);
              setEditing(null);
              loadSubjects();
            } catch {
              message.error("Save failed.");
            }
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      {/* ASSIGN MODAL */}
      <AssignSubjectModal
        subjectId={assignSubjectId}
        open={assignOpen}
        onClose={() => { setAssignOpen(false); setAssignSubjectId(null); }}
      />
    </Space>
  );
}
