// src/pages/parent/myfamily/MyFamily.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card, Row, Col, Input, Button, Tag, Empty, Popconfirm, message, Avatar, Badge, Skeleton, Space
} from "antd";
import {
  PlusOutlined, ReloadOutlined, UserOutlined, IdcardOutlined, BookOutlined, HomeOutlined
} from "@ant-design/icons";
import AddStudentModal, { DUMMY_STUDENTS } from "./AddStudentModal";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";

const LS_KEY = "kib_parent_family_student_ids";

function getLinkedIds() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function setLinkedIds(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(new Set(arr.map(Number)))));
}
function addLinkedId(id) {
  const ids = getLinkedIds();
  setLinkedIds([...ids, Number(id)]);
}
function removeLinkedId(id) {
  const set = new Set(getLinkedIds());
  set.delete(Number(id));
  setLinkedIds(Array.from(set));
}

export default function MyFamily() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState([]);
  const [q, setQ] = useState("");

  const [addOpen, setAddOpen] = useState(params.get("add") === "1");
  useEffect(() => setAddOpen(params.get("add") === "1"), [params]);

  const normalizeStudent = (row) => ({
    student_id: row?.student_id ?? row?.id,
    first_name: row?.first_name ?? row?.user?.first_name ?? "",
    last_name: row?.last_name ?? row?.user?.last_name ?? "",
    email: row?.email ?? row?.user?.email ?? "",
    status: row?.status ?? row?.user?.status ?? "Active",
    grade: row?.grade ?? row?.user?.grade ?? null,
    class_name: row?.class_name ?? row?.class?.name ?? null,
    school: row?.school ?? row?.school?.name ?? null,
    avatar: row?.avatar ?? row?.user?.avatar ?? null,
  });

  // Load purely from localStorage + DUMMY_STUDENTS
  const refresh = () => {
    setLoading(true);
    const ids = getLinkedIds();
    const dict = new Map(DUMMY_STUDENTS.map((d) => [Number(d.student_id), d]));
    const data = ids.map((id) => dict.get(Number(id))).filter(Boolean);
    setFamily((data || []).map(normalizeStudent));
    // tiny delay to show skeletons a bit
    setTimeout(() => setLoading(false), 150);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const qt = q.trim().toLowerCase();
    if (!qt) return family;
    return family.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const idStr = String(s.student_id || "").toLowerCase();
      const email = String(s.email || "").toLowerCase();
      const grade = String(s.grade || "").toLowerCase();
      const school = String(s.school || "").toLowerCase();
      return name.includes(qt) || idStr.includes(qt) || email.includes(qt) || grade.includes(qt) || school.includes(qt);
    });
  }, [q, family]);

  const unlink = (student_id) => {
    removeLinkedId(student_id);
    setFamily((prev) => prev.filter((s) => Number(s.student_id) !== Number(student_id)));
    message.success("Student removed from your family.");
  };

  return (
    <GradientShell>
      {/* Add bottom padding so content isn't hidden behind the fixed mobile tab bar */}
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">My Family</h1>
            <p className="text-gray-600 m-0">Manage students linked to your account.</p>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setParams({ add: "1" })}>
              Add Student
            </Button>
          </Space>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Input.Search
            placeholder="Search by name, Student ID, email, grade, or school"
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={(v) => setQ(v)}
            className="max-w-xl rounded-xl"
          />
          <div className="text-sm text-gray-600">
            {loading ? "Loading…" : `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card className="shadow-sm rounded-2xl">
                  <Skeleton active avatar paragraph={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : filtered.length === 0 ? (
          <Card className="shadow-sm rounded-2xl">
            <Empty
              description={
                <span>
                  No students yet. Click <strong>Add Student</strong> to link one to your family.
                </span>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setParams({ add: "1" })}>
                Add Student
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {filtered.map((s) => (
              <Col xs={24} sm={12} lg={8} key={s.student_id}>
                <Card
                  className="shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition"
                  onClick={() => navigate(`/parent/myfamily/student/${s.student_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/parent/myfamily/student/${s.student_id}`);
                  }}
                  tabIndex={0}
                  actions={[
                    <Button
                      key="activity"
                      type="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/parent/myfamily/activity?student=${s.student_id}`);
                      }}
                    >
                      Activity
                    </Button>,
                    <Popconfirm
                      key="remove"
                      title="Remove this student from your family?"
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                      onConfirm={(e) => {
                        e?.stopPropagation?.();
                        unlink(s.student_id);
                      }}
                      onCancel={(e) => e?.stopPropagation?.()}
                    >
                      <Button danger type="link" onClick={(e) => e.stopPropagation()}>
                        Remove
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <div className="flex items-start gap-3">
                    <Badge dot={String(s.status).toLowerCase() === "active"}>
                      <Avatar
                        size={56}
                        src={s.avatar || undefined}
                        icon={!s.avatar ? <UserOutlined /> : undefined}
                        className="shadow"
                      />
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-base truncate">
                          {s.first_name} {s.last_name}
                        </div>
                        {s.status && (
                          <Tag color={String(s.status).toLowerCase() === "active" ? "green" : "default"}>
                            {s.status}
                          </Tag>
                        )}
                      </div>

                      <div className="mt-1 grid grid-cols-1 gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <IdcardOutlined />
                          <span className="truncate">ID #{s.student_id}</span>
                        </div>
                        {s.grade && (
                          <div className="flex items-center gap-2">
                            <BookOutlined />
                            <span className="truncate">Grade {s.grade}</span>
                          </div>
                        )}
                        {(s.class_name || s.school) && (
                          <div className="flex items-center gap-2">
                            <HomeOutlined />
                            <span className="truncate">
                              {s.class_name ? `${s.class_name}` : ""}
                              {s.class_name && s.school ? " · " : ""}
                              {s.school || ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Add Student modal */}
        <AddStudentModal
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            navigate("/parent/myfamily/family", { replace: true });
          }}
          onSuccess={(payload) => {
            // payload is expected to be { student_id }
            if (payload?.student_id) addLinkedId(payload.student_id);
            refresh();
            setAddOpen(false);
            navigate("/parent/myfamily/family", { replace: true });
          }}
        />
      </div>

      {/* Mobile-only bottom tabs */}
      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
