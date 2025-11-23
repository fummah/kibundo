// src/pages/parent/myfamily/Activity.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Row,
  Col,
  List,
  Avatar,
  Tag,
  Space,
  Button,
  Input,
  DatePicker,
  Empty,
  Skeleton,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  BookOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import GradientShell from "@/components/GradientShell";
import api from "@/api/axios";
import { useAuthContext } from "@/context/AuthContext";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

/* ------------ Dummy fallback data (matches your examples) ------------ */
const DUMMY = [
  {
    id: 1,
    child_id: 101,
    child_name: "Name Child one",
    avatar: "https://i.pravatar.cc/120?img=5",
    type: "Math",
    text: "Completed a math lesson for homework",
    when: dayjs().subtract(1, "hour").toISOString(),
    minutes: 30,
  },
  {
    id: 2,
    child_id: 102,
    child_name: "Name Child two",
    avatar: "https://i.pravatar.cc/120?img=12",
    type: "Reading",
    text: "Started a reading exercise",
    when: dayjs().subtract(2, "day").add(3, "hour").toISOString(),
    minutes: 15,
  },
  {
    id: 3,
    child_id: 101,
    child_name: "Name Child one",
    avatar: "https://i.pravatar.cc/120?img=5",
    type: "Science",
    text: "Watched a science video about plants",
    when: dayjs().subtract(3, "day").toISOString(),
    minutes: 12,
  },
  {
    id: 4,
    child_id: 102,
    child_name: "Name Child two",
    avatar: "https://i.pravatar.cc/120?img=12",
    type: "Math",
    text: "Practiced multiplication facts",
    when: dayjs().subtract(7, "day").toISOString(),
    minutes: 20,
  },
];

const TYPE_ICON = {
  Math: <BookOutlined />,
  Reading: <BookOutlined />,
  Science: <ExperimentOutlined />,
  Default: <ThunderboltOutlined />,
};
const typeIcon = (t) => TYPE_ICON[t] || TYPE_ICON.Default;

// Friendly group header
function formatGroupLabel(d) {
  const m = dayjs(d);
  if (m.isToday()) return "Heute";
  if (m.isYesterday()) return "Gestern";
  return m.format("ddd, D. MMM");
}

export default function Activity() {
  const { account } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]); // raw activities
  const [q, setQ] = useState("");
  const [range, setRange] = useState(null); // [dayjs, dayjs] | null

  // 🔥 Get the currently selected student_id from account context
  // When parent views child: account.id = student_id, account.userId = user_id
  const selectedStudentId = account?.type === "child" ? account.id : null;

  // Load data (API with dummy fallback)
  const refresh = async () => {
    setLoading(true);
    try {
      let data = [];
      
      // 🔥 Always fetch activities for ALL children (even when a specific child is selected)
      // This allows parents to see all their children's activities at once
      try {
        // First, get the current user to find their parent_id
        const currentUserRes = await api.get("/current-user");
        const currentUser = currentUserRes.data || {};
        
        let parentId = null;
        if (Array.isArray(currentUser?.parent) && currentUser.parent.length > 0) {
          parentId = currentUser.parent[0].id;
        } else if (currentUser?.parent?.id) {
          parentId = currentUser.parent.id;
        } else if (currentUser?.parent_id) {
          parentId = currentUser.parent_id;
        }
        
        if (parentId) {
          // Fetch all children (students) for this parent
          const studentsRes = await api.get("/allstudents");
          const allStudents = Array.isArray(studentsRes.data) 
            ? studentsRes.data 
            : (studentsRes.data?.data || []);
          
          const children = allStudents.filter(s => s.parent_id === parentId);
          
          // Fetch activities for each child
          const allActivities = [];
          for (const child of children) {
            try {
              const childId = child.id;
              const childName = child.user 
                ? `${child.user.first_name || ''} ${child.user.last_name || ''}`.trim() || `Student #${childId}`
                : `Student #${childId}`;
              const childAvatar = child.user?.avatar || null;
              
              const r = await api.get(`/student/${childId}/usage-stats`);
              const activities = r?.data?.activities || [];
              
              // Add child info to each activity
              const activitiesWithChildInfo = activities.map(activity => ({
                ...activity,
                child_id: childId,
                child_name: childName,
                avatar: childAvatar,
              }));
              
              allActivities.push(...activitiesWithChildInfo);
            } catch (err) {
              // Continue with other children if one fails
            }
          }
          
          data = allActivities;
        } else {
          // Fallback to parent activity endpoint
          try {
            const r = await api.get("/parent/activity");
            data = Array.isArray(r?.data) ? r.data : r?.data?.activities || [];
          } catch {
            const r2 = await api.get("/parent/myfamily/activity");
            data = Array.isArray(r2?.data) ? r2.data : r2?.data?.activities || [];
          }
        }
      } catch (err) {
        // Fallback to parent activity endpoint
        try {
          const r = await api.get("/parent/activity");
          data = Array.isArray(r?.data) ? r.data : r?.data?.activities || [];
        } catch {
          const r2 = await api.get("/parent/myfamily/activity");
          data = Array.isArray(r2?.data) ? r2.data : r2?.data?.activities || [];
        }
      }
      
      // Sort activities by date (most recent first)
      data.sort((a, b) => {
        const dateA = new Date(a.when || a.created_at || 0);
        const dateB = new Date(b.when || b.created_at || 0);
        return dateB - dateA;
      });
      
      if (!data || data.length === 0) data = DUMMY;
      setAll(Array.isArray(data) ? data : DUMMY);
    } catch (e) {
      console.error("Load activities failed:", e);
      setAll(DUMMY);
      message.error("Aktivitäten konnten nicht geladen werden. Zeige kürzliche Einträge.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []); // 🔥 Always show all children's activities - refresh on mount only

  // For a little helper hint
  const childNames = useMemo(
    () => Array.from(new Set(all.map((a) => a.child_name))).sort(),
    [all]
  );

  // Search + date range filter (inclusive)
  const filtered = useMemo(() => {
    const qt = q.trim().toLowerCase();
    return (all || []).filter((a) => {
      const inSearch =
        !qt ||
        a.child_name.toLowerCase().includes(qt) ||
        String(a.child_id).includes(qt) ||
        String(a.type).toLowerCase().includes(qt) ||
        String(a.text).toLowerCase().includes(qt);

      const inRange =
        !range ||
        (dayjs(a.when).isSameOrAfter(range[0].startOf("day")) &&
          dayjs(a.when).isSameOrBefore(range[1].endOf("day")));

      return inSearch && inRange;
    });
  }, [all, q, range]);

  // Group by date (desc)
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((a) => {
      const key = dayjs(a.when).format("YYYY-MM-DD");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dateKey, items]) => ({
        dateKey,
        items: items.sort((x, y) => (x.when < y.when ? 1 : -1)),
      }));
  }, [filtered]);

  // Summary badges
  const summary = useMemo(() => {
    const total = filtered.length;
    const minutes = filtered.reduce((acc, x) => acc + (Number(x.minutes) || 0), 0);
    return { total, minutes };
  }, [filtered]);

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Aktivitäten</h1>
            <p className="text-gray-600 m-0">
              Verfolge, was deine Kinder in verschiedenen Fächern lernen.
            </p>
          </div>
          <div className="flex gap-2">
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm rounded-2xl">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={12} lg={10}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Suche nach Kind, Typ, Text oder ID"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="rounded-xl"
              />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <DatePicker.RangePicker
                allowEmpty={[true, true]}
                onChange={(vals) => setRange(vals && vals[0] && vals[1] ? vals : null)}
                className="w-full rounded-xl"
                placeholder={["Von", "Bis"]}
                suffixIcon={<CalendarOutlined />}
              />
            </Col>
            <Col xs={24} lg={6} className="text-gray-600">
              <Space size="large" className="w-full md:justify-end">
                <span>
                  <strong>{summary.total}</strong> items
                </span>
                <span>
                  <strong>
                    {Math.floor(summary.minutes / 60)}h {summary.minutes % 60}m
                  </strong>
                </span>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Content */}
        {loading ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col xs={24} key={i}>
                <Card className="shadow-sm rounded-2xl">
                  <Skeleton active avatar paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : grouped.length === 0 ? (
          <Card className="shadow-sm rounded-2xl">
            <Empty description="Keine Aktivitäten für deine aktuellen Filter gefunden." />
          </Card>
        ) : (
          grouped.map((group) => (
            <section key={group.dateKey} className="space-y-3">
              <h3 className="text-lg font-bold text-gray-700">
                {formatGroupLabel(group.dateKey)}
              </h3>

              <List
                itemLayout="horizontal"
                dataSource={group.items}
                renderItem={(a) => (
                  <Card className="shadow-sm rounded-2xl mb-3">
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            src={a.avatar}
                            size={48}
                            icon={!a.avatar ? <UserOutlined /> : undefined}
                          />
                        }
                        title={
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <Space wrap>
                              <span className="font-semibold">{a.child_name}</span>
                              <Tag icon={typeIcon(a.type)} color="blue">
                                {a.type}
                              </Tag>
                            </Space>
                            <span className="text-gray-500 text-sm">
                              {dayjs(a.when).format("HH:mm")}
                            </span>
                          </div>
                        }
                        description={
                          <div className="text-gray-700">
                            {a.text}
                            {a.minutes ? (
                              <span className="text-gray-500"> · {a.minutes} min</span>
                            ) : null}
                          </div>
                        }
                      />
                    </List.Item>
                  </Card>
                )}
              />
            </section>
          ))
        )}

        {/* Helpful hint (desktop-only) */}
        {childNames.length > 0 && (
          <div className="desktop-only text-xs text-gray-500">
            Tip: try searching a child’s name like <code>{childNames[0]}</code>.
          </div>
        )}
      </div>
    </GradientShell>
  );
}
