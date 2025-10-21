import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Card,
  Typography,
  Input,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  Segmented,
  Skeleton,
  Row,
  Col,
  Divider,
  Avatar,
  Badge,
  Tooltip,
  Alert,
  Statistic,
  Grid,
} from "antd";
import {
  Wand2,
  Palette,
  Volume2,
  LogOut,
  User2,
  GraduationCap,
  Users,
  BookOpen,
  Settings,
  Save,
  Edit,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

const { Title, Text } = Typography;

const BUDDIES = [
  { id: "m1", name: "Milo", img: "/src/assets/buddies/kibundo-buddy.png" },
  { id: "m2", name: "Lumi", img: "/src/assets/buddies/kibundo-buddy1.png" },
  { id: "m3", name: "Zuzu", img: "/src/assets/buddies/monster1.png" },
  { id: "m4", name: "Kiko", img: "/src/assets/buddies/monster2.png" },
  { id: "m5", name: "Pipa", img: "/src/assets/buddies/Hausaufgaben.png" },
  { id: "m6", name: "Nori", img: "/src/assets/buddies/Lernen.png" },
];

const THEMES = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "sky", label: "Sky" },
];

// Stronger gradient so the header color is clearly visible
const THEME_GRADIENT = {
  indigo: "from-indigo-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  rose: "from-rose-500 to-rose-600",
  amber: "from-amber-500 to-amber-600",
  sky: "from-sky-500 to-sky-600",
};

const THEME_SWATCH = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
};

export default function StudentSettings() {
  const navigate = useNavigate();
  const { message } =
    App.useApp?.() ?? { message: { success: () => {}, error: () => {}, info: () => {} } };

  const { buddy, setBuddy, interests, setInterests, profile, setProfile } = useStudentApp();
  const auth = useAuthContext?.();
  const { user, logout, signOut } = auth || {};
  const userId = user?.id ?? user?._id ?? user?.user_id ?? null;

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const avatarSize = screens.lg ? 96 : screens.md ? 80 : 64;

  const defaultName = useMemo(() => {
    if (profile?.name) return profile.name;
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [profile?.name, user]);

  // local state
  const [name, setName] = useState(defaultName);
  const [ttsEnabled, setTTSEnabled] = useState(Boolean(profile?.ttsEnabled));
  const [theme, setTheme] = useState(profile?.theme || "indigo");
  const [interestDraft, setInterestDraft] = useState("");
  const [buddyModal, setBuddyModal] = useState(false);
  const [pendingBuddy, setPendingBuddy] = useState(buddy || BUDDIES[0]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentData, setStudentData] = useState(null);

  const [hasServerRecord, setHasServerRecord] = useState(false);
  const [serverStudentId, setServerStudentId] = useState(null);

  // baseline
  const initialRef = useRef({
    name: defaultName,
    ttsEnabled: Boolean(profile?.ttsEnabled),
    theme,
    buddy,
  });

  const isDirty = useMemo(() => {
    const a = initialRef.current;
    return (
      a.name !== name ||
      a.ttsEnabled !== ttsEnabled ||
      a.theme !== theme ||
      (a.buddy?.id ?? null) !== (buddy?.id ?? null) ||
      (interests?.length ?? 0) !== (profile?.interests?.length ?? 0)
    );
  }, [name, ttsEnabled, theme, buddy, interests, profile?.interests?.length]);

  const themePreview = useMemo(() => THEME_GRADIENT[theme] || THEME_GRADIENT.indigo, [theme]);

  // ----- Live buddy preview -----
  const displayBuddy = buddyModal ? (pendingBuddy || buddy) : buddy;
  const isPreviewingBuddy = buddyModal && (pendingBuddy?.id !== buddy?.id);

  // ---------- Load settings without 404s ----------
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const sid = (obj) => obj?.id ?? obj?._id ?? obj?.student_id;

    const load = async () => {
      try {
        setLoading(true);

        const allRes = await api.get("/allstudents", {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const match = all.find(
          (s) =>
            s?.user?.id === userId ||
            s?.user_id === userId ||
            sid(s) === userId
        );

        if (!match) {
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          initialRef.current = {
            name: defaultName ?? "",
            ttsEnabled: Boolean(profile?.ttsEnabled),
            theme: profile?.theme || "indigo",
            buddy: buddy ?? null,
          };
          return;
        }

        const foundId = sid(match);
        const { data, status } = await api.get(`/student/${foundId}`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        if (status === 404 || !data) {
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          return;
        }

        if (cancelled) return;

        setHasServerRecord(true);
        setServerStudentId(foundId);

        const srvProfile = data?.profile ?? {};
        const srvInterests = Array.isArray(data?.interests) ? data.interests : [];
        const srvBuddy = data?.buddy ?? null;

        setStudentData(data);

        setProfile({
          name: srvProfile.name ?? "",
          ttsEnabled: Boolean(srvProfile.ttsEnabled),
          theme: srvProfile.theme || "indigo",
        });
        setInterests(srvInterests);
        setBuddy(srvBuddy);

        const serverName = srvProfile.name ?? "";
        const apiUser = data?.user ?? {};
        const apiUserName = [apiUser.first_name, apiUser.last_name].filter(Boolean).join(" ").trim();
        const fallbackName = defaultName ?? "";
        const finalName = serverName || apiUserName || fallbackName;

        setName(finalName);
        setTTSEnabled(Boolean(srvProfile.ttsEnabled));
        setTheme(srvProfile.theme || "indigo");
        setPendingBuddy(srvBuddy || BUDDIES[0]);

        initialRef.current = {
          name: srvProfile.name ?? (defaultName ?? ""),
          ttsEnabled: Boolean(srvProfile.ttsEnabled),
          theme: srvProfile.theme || "indigo",
          buddy: srvBuddy,
        };
      } catch (e) {
        if (!cancelled) {
          message.error?.("Could not load your settings. Using local defaults.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---------- Create on first save ----------
  const createStudentOnServer = async ({ profile, interests, buddy }) => {
    const payload = {
      userId,
      profile: {
        name: profile?.name ?? "",
        ttsEnabled: Boolean(profile?.ttsEnabled),
        theme: profile?.theme || "indigo",
      },
      interests: Array.isArray(interests) ? interests : [],
      buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
    };
    const res = await api.post(`/addstudent`, payload);
    return res?.data;
  };

  const saveProfileAll = async () => {
    try {
      setSaving(true);
      setProfile({ name, ttsEnabled, theme });

      if (!hasServerRecord) {
        const created = await createStudentOnServer({
          profile: { name, ttsEnabled, theme },
          interests: interests || [],
          buddy: buddy || null,
        });
        setHasServerRecord(true);
        setServerStudentId(created?.id ?? created?._id ?? userId);
        message.success?.("Student created and settings saved!");
      } else {
        message.info?.("Settings saved.");
      }

      initialRef.current = { name, ttsEnabled, theme, buddy };
    } catch {
      message.error?.("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addInterest = () => {
    const v = interestDraft.trim();
    if (!v) return;
    if ((interests || []).includes(v)) {
      message.info?.("Already added.");
      return;
    }
    setInterests([...(interests || []), v]);
    setInterestDraft("");
  };

  const removeInterest = (val) => {
    setInterests((arr) => (arr || []).filter((x) => x !== val));
  };

  const confirmBuddy = async () => {
    try {
      setBuddy(pendingBuddy);

      if (!hasServerRecord) {
        const created = await createStudentOnServer({
          profile: { name, ttsEnabled, theme },
          interests: interests || [],
          buddy: pendingBuddy,
        });
        setHasServerRecord(true);
        setServerStudentId(created?.id ?? created?._id ?? userId);
        setBuddyModal(false);
        message.success?.(`Buddy selected: ${pendingBuddy.name}`);
      } else {
        setBuddyModal(false);
        message.info?.("Buddy changed.");
      }

      initialRef.current = { ...initialRef.current, buddy: pendingBuddy };
    } catch {
      message.error?.("Could not apply buddy. Please try again.");
    }
  };

  const resetAll = () => {
    try {
      const STUDENT_LS_KEYS = [
        "kibundo_buddy",
        "kibundo_interests",
        "kibundo_profile",
        "kibundo.student.buddy.v1",
        "kibundo.student.interests.v1",
        "kibundo.student.profile.v1",
      ];
      STUDENT_LS_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
    setBuddy(null);
    setInterests([]);
    setProfile({ name: "", ttsEnabled: false, theme: "indigo" });
    setName("");
    setTTSEnabled(false);
    setTheme("indigo");
    message.success?.("All student data reset on this device.");
  };

  const doLogout = async () => {
    try {
      if (logout) await logout();
      else if (signOut) await signOut();
    } catch {}
    navigate("/signin");
  };

  const ThemeOption = ({ value, label }) => (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded-full ${THEME_SWATCH[value]}`} />
      <span>{label}</span>
    </div>
  );

  return (
    <div
      className={`
        relative bg-gradient-to-b from-white to-neutral-50 
        min-h-[100svh] lg:h-full overflow-y-auto 
        px-3 sm:px-4 md:px-6 py-4 pb-24
      `}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton className="p-2 rounded-full hover:bg-neutral-100 active:scale-95" aria-label="Back" />
          <div className="min-w-0">
            <Title level={3} className="!mb-0 flex items-center gap-2 !text-[clamp(1.15rem,2vw,1.5rem)]">
              <Settings className="h-5 w-5 shrink-0" />
              <span className="truncate">Settings</span>
            </Title>
            <Text type="secondary" className="block truncate">Manage your profile and preferences</Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Save className="h-4 w-4" />}
          onClick={saveProfileAll}
          loading={saving}
          disabled={saving || (!isDirty && hasServerRecord)}
          className="rounded-xl w-full sm:w-auto"
        >
          Save Changes
        </Button>
      </div>

      {/* Profile Overview Card */}
      <Card className="rounded-2xl mb-6 border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
        <div className={`p-4 sm:p-6 bg-gradient-to-br ${themePreview} rounded-t-2xl text-white`}>
          <Row align="middle" gutter={[16, 16]} wrap>
            <Col xs={6} sm={"auto"}>
              <Badge dot={isDirty} color="#52c41a">
                <img
                  src={displayBuddy?.img || "/src/assets/buddies/kibundo-buddy.png"}
                  alt={displayBuddy?.name || "Learning Buddy"}
                  width={avatarSize}
                  height={avatarSize}
                  className="border-2 border-white shadow-lg object-contain"
                  style={{ borderRadius: 0 }}
                  onError={(e) => {
                    e.target.src = "/src/assets/buddies/kibundo-buddy.png";
                  }}
                />
              </Badge>
            </Col>
            <Col flex="auto">
              <div>
                <div className="text-xs sm:text-sm opacity-90 flex items-center gap-1 mb-1">
                  <Palette className="h-3.5 w-3.5" />
                  Theme Preview
                </div>
                <Title level={3} className="!mb-1 !text-white !text-[clamp(1.1rem,2.2vw,1.6rem)]">
                  {name || defaultName || "Student"}
                </Title>
                <Text className="text-white/90 block truncate">
                  Student ID: {userId || "N/A"}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={"auto"}>
              <Tooltip title="Profile has unsaved changes">
                <Button type="text" icon={<Edit className="h-4 w-4" />} className="text-white hover:bg-white/20 w-full sm:w-auto">
                  Edit Profile
                </Button>
              </Tooltip>
            </Col>
          </Row>
        </div>

        {/* Quick Stats */}
        <div className="p-4 sm:p-6">
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={8}>
              <Statistic
                title="Class"
                value={studentData?.class?.class_name || studentData?.class_name || "N/A"}
                prefix={<GraduationCap className="h-4 w-4" />}
                valueStyle={{ fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Statistic
                title="Subjects"
                value={studentData?.subject?.length || 0}
                prefix={<BookOpen className="h-4 w-4" />}
                valueStyle={{ fontSize: 16, fontWeight: 600 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Parent"
                value={
                  studentData?.parent?.user
                    ? [studentData.parent.user.first_name, studentData.parent.user.last_name]
                        .filter(Boolean)
                        .join(" ") || "Linked"
                    : "N/A"
                }
                prefix={<Users className="h-4 w-4" />}
                valueStyle={{ fontSize: 16, fontWeight: 600 }}
              />
            </Col>
          </Row>
        </div>
      </Card>

      {/* Profile Settings / Theme */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space wrap>
                <User2 className="h-5 w-5" />
                <span>Profile Settings</span>
              </Space>
            }
            className="rounded-2xl shadow-sm"
            extra={
              isDirty && (
                <Tag color="orange" icon={<Edit className="h-3 w-3" />}>
                  Unsaved Changes
                </Tag>
              )
            }
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <div className="space-y-2">
                    <Text strong>Display Name</Text>
                    <Input
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl"
                      size="large"
                    />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="space-y-2">
                    <Text strong>Student ID</Text>
                    <Input value={userId || "N/A"} disabled className="rounded-xl" size="large" />
                  </div>
                </Col>
                <Col xs={24}>
                  <Divider className="my-3" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Text strong className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          Text-to-Speech (Buddy voice)
                        </Text>
                        <div className="text-sm text-gray-500 mt-1">
                          Enable voice feedback from your buddy
                        </div>
                      </div>
                      <Switch checked={ttsEnabled} onChange={setTTSEnabled} size="default" />
                    </div>
                  </div>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space wrap>
                <Palette className="h-5 w-5" />
                <span>Theme</span>
              </Space>
            }
            className="rounded-2xl shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <Text strong className="block mb-3">
                  Color Theme
                </Text>
                <Segmented
                  block
                  value={theme}
                  onChange={(val) => setTheme(val)}
                  options={THEMES.map((t) => ({
                    label: <ThemeOption value={t.value} label={t.label} />,
                    value: t.value,
                  }))}
                  className="!rounded-xl w-full"
                  size="large"
                />
              </div>
              <Alert
                message="Theme Preview"
                description="Your selected theme will be applied across the entire application."
                type="info"
                icon={<Info className="h-4 w-4" />}
                showIcon
                className="rounded-xl"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Buddy & Academic Information */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space wrap>
                <Wand2 className="h-5 w-5" />
                <span>Learning Buddy</span>
              </Space>
            }
            className="rounded-2xl shadow-sm"
            loading={loading}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src={displayBuddy?.img || "/src/assets/buddies/kibundo-buddy.png"}
                alt={displayBuddy?.name || "Learning Buddy"}
                width={64}
                height={64}
                className="border-2 border-gray-100 object-contain"
                style={{ borderRadius: 0 }}
                onError={(e) => {
                  e.target.src = "/src/assets/buddies/kibundo-buddy.png";
                }}
              />
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <Title level={5} className="!mb-1">
                    {displayBuddy?.name || "No buddy selected yet"}
                  </Title>
                  {isPreviewingBuddy && (
                    <Tag color="blue" className="!mt-[-2px]">Preview</Tag>
                  )}
                </div>
                <Text type="secondary" className="block mb-3">
                  Pick a monster friend to guide you through your learning journey.
                </Text>
                <Button type="primary" className="rounded-xl" onClick={() => setBuddyModal(true)} icon={<Edit className="h-4 w-4" />}>
                  Change Buddy
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space wrap>
                <GraduationCap className="h-5 w-5" />
                <span>Academic Information</span>
              </Space>
            }
            className="rounded-2xl shadow-sm"
            loading={loading}
          >
            <div className="space-y-4">
              <div>
                <Text strong className="block mb-2">Class</Text>
                <Tag color="blue" className="text-sm px-3 py-1 rounded-lg">
                  {studentData?.class?.class_name || studentData?.class_name || "N/A"}
                </Tag>
              </div>
              <div className="min-w-0">
                <Text strong className="block mb-2">Parent/Guardian</Text>
                <Text className="text-gray-600 break-words">
                  {studentData?.parent?.user
                    ? [studentData.parent.user.first_name, studentData.parent.user.last_name].filter(Boolean).join(" ") ||
                      studentData.parent.user.email ||
                      "N/A"
                    : "N/A"}
                </Text>
              </div>
              <div>
                <Text strong className="block mb-2">Enrolled Subjects</Text>
                <div className="flex flex-wrap gap-2">
                  {studentData?.subject?.length > 0 ? (
                    studentData.subject.map((s, index) => (
                      <Tag key={index} color="green" className="text-sm px-3 py-1 rounded-lg">
                        {s.subject_name || s.name}
                      </Tag>
                    ))
                  ) : (
                    <Tag color="default" className="text-sm px-3 py-1 rounded-lg">
                      No subjects enrolled
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Interests */}
      <Card className="rounded-2xl mt-4 mb-3" bodyStyle={{ paddingTop: 16, paddingBottom: 16 }} loading={loading}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Title level={5} className="!mb-2 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> Interests
          </Title>
          <Button type="default" className="rounded-xl w-full sm:w-auto" onClick={() => navigate("/student/onboarding/interests")}>
            Run Interests Wizard
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {(interests || []).length === 0 ? (
            <Text type="secondary">No interests yet — add a few below.</Text>
          ) : (
            (interests || []).map((it) => (
              <Tag
                key={it}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  removeInterest(it);
                }}
                className="rounded-full px-3 py-1"
              >
                {it}
              </Tag>
            ))
          )}
        </div>

        <Space.Compact className="w-full">
          <Input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            placeholder="Add an interest (e.g., Dinosaurs)"
            className="rounded-l-xl"
            onPressEnter={addInterest}
          />
        <Button type="primary" onClick={addInterest} className="rounded-r-xl">
            Add
          </Button>
        </Space.Compact>

        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={saveProfileAll}
            className="rounded-xl w-full sm:w-auto"
            loading={saving}
            disabled={saving || (!isDirty && hasServerRecord)}
          >
            Save Changes
          </Button>
          <Button onClick={resetAll} className="rounded-xl w-full sm:w-auto" danger>
            Reset Local Data
          </Button>
        </div>
      </Card>

      {/* Account */}
      <Card className="rounded-2xl mb-3" styles={{ body: { paddingTop: 16, paddingBottom: 16 } }}>
        <Title level={5} className="!mb-2">
          Account
        </Title>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Text type="secondary">Sign out from this device.</Text>
          <Button icon={<LogOut className="h-4 w-4" />} danger onClick={doLogout} className="rounded-xl w-full sm:w-auto">
            Log out
          </Button>
        </div>
      </Card>

      {/* Sticky mobile save bar */}
      {isDirty && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur px-4 py-3 z-40">
          <Button
            type="primary"
            icon={<Save className="h-4 w-4" />}
            className="w-full rounded-xl"
            onClick={saveProfileAll}
            loading={saving}
            disabled={saving || (!isDirty && hasServerRecord)}
            aria-live="polite"
          >
            Save Changes
          </Button>
        </div>
      )}

      {/* Buddy modal with live preview */}
      <Modal
        open={buddyModal}
        onCancel={() => setBuddyModal(false)}
        onOk={confirmBuddy}
        okText="Choose"
        className="rounded-2xl"
        width={isMobile ? 360 : 520}
      >
        <Title level={5} className="!mb-3">
          Choose a Buddy
        </Title>

        {/* Live preview in modal */}
        <div className="mb-4 flex items-center gap-3">
          <Avatar size={72} src={(pendingBuddy || buddy)?.img || "https://placekitten.com/200/207"} />
          <div>
            <div className="font-semibold text-base">
              {(pendingBuddy || buddy)?.name || "Select a buddy"}
            </div>
            <Text type="secondary" className="text-xs">
              This is how your buddy will look before you apply it.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {BUDDIES.map((b) => (
            <button
              key={b.id}
              onClick={() => setPendingBuddy(b)}
              className={`text-left rounded-xl border-2 p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-300 ${
                pendingBuddy?.id === b.id ? "border-blue-500" : "border-transparent hover:border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <BuddyAvatar src={b.img} size={56} />
                <div className="font-semibold">{b.name}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
