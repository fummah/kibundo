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
  Tabs,
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
        
        console.log("🔍 Loading student settings for userId:", userId);

        const allRes = await api.get("/allstudents", {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        console.log("📚 Total students found:", all.length);
        
        const match = all.find(
          (s) =>
            s?.user?.id === userId ||
            s?.user_id === userId ||
            sid(s) === userId
        );
        
        console.log("🔍 Student match result:", {
          userId,
          found: !!match,
          studentId: match ? sid(match) : null
        });

        if (!match) {
          if (cancelled) return;
          console.warn("⚠️ No student record found - settings will be saved locally only");
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
        
        console.log("✅ Student record loaded:", {
          foundId,
          hasProfile: !!data?.profile,
          hasInterests: !!data?.interests,
          hasBuddy: !!data?.buddy,
          data
        });

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
        // Create new student record
        const created = await createStudentOnServer({
          profile: { name, ttsEnabled, theme },
          interests: interests || [],
          buddy: buddy || null,
        });
        setHasServerRecord(true);
        setServerStudentId(created?.id ?? created?._id ?? userId);
        message.success?.("Student created and settings saved!");
      } else {
        // Update existing student record in database
        const payload = {
          profile: {
            name: name ?? "",
            ttsEnabled: Boolean(ttsEnabled),
            theme: theme || "indigo",
          },
          interests: Array.isArray(interests) ? interests : [],
          buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
        };
        
        console.log("💾 Saving settings:", { 
          studentId: serverStudentId, 
          payload,
          theme: theme
        });
        
        const response = await api.patch(`/student/${serverStudentId}`, payload);
        console.log("✅ Settings saved successfully:", response.data);
        message.success?.(`Settings saved! Theme: ${theme}`);
      }

      initialRef.current = { name, ttsEnabled, theme, buddy };
    } catch (error) {
      console.error("❌ Failed to save settings:", error);
      message.error?.("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addInterest = async () => {
    const v = interestDraft.trim();
    if (!v) return;
    if ((interests || []).includes(v)) {
      message.info?.("Already added.");
      return;
    }
    const newInterests = [...(interests || []), v];
    setInterests(newInterests);
    setInterestDraft("");
    
    console.log("📝 Adding interest:", {
      hasServerRecord,
      serverStudentId,
      newInterests
    });
    
    // Auto-save interests to database
    if (hasServerRecord && serverStudentId) {
      try {
        const payload = {
          profile: { name: name ?? "", ttsEnabled: Boolean(ttsEnabled), theme: theme || "indigo" },
          interests: newInterests,
          buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
        };
        
        console.log("📤 Sending interest update to database:", {
          url: `/student/${serverStudentId}`,
          payload
        });
        
        const response = await api.patch(`/student/${serverStudentId}`, payload);
        console.log("✅ Interest added and saved:", { newInterests, response: response.data });
        message.success?.(`Interest "${v}" saved!`);
      } catch (error) {
        console.error("❌ Failed to save interest:", error);
        message.error?.("Could not save interest. Please try again.");
      }
    } else {
      console.warn("⚠️ Cannot save interest - no server record:", {
        hasServerRecord,
        serverStudentId
      });
      message.warning?.(`Interest "${v}" added locally. Click Save Settings to persist.`);
    }
  };

  const removeInterest = async (val) => {
    const newInterests = (interests || []).filter((x) => x !== val);
    setInterests(newInterests);
    
    console.log("🗑️ Removing interest:", {
      hasServerRecord,
      serverStudentId,
      newInterests
    });
    
    // Auto-save interests to database
    if (hasServerRecord && serverStudentId) {
      try {
        const payload = {
          profile: { name: name ?? "", ttsEnabled: Boolean(ttsEnabled), theme: theme || "indigo" },
          interests: newInterests,
          buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
        };
        
        console.log("📤 Sending interest removal to database:", {
          url: `/student/${serverStudentId}`,
          payload
        });
        
        const response = await api.patch(`/student/${serverStudentId}`, payload);
        console.log("✅ Interest removed and saved:", { newInterests, response: response.data });
        message.success?.(`Interest "${val}" removed!`);
      } catch (error) {
        console.error("❌ Failed to save interest removal:", error);
        message.error?.("Could not remove interest. Please try again.");
      }
    } else {
      console.warn("⚠️ Cannot save interest removal - no server record:", {
        hasServerRecord,
        serverStudentId
      });
      message.warning?.(`Interest "${val}" removed locally. Click Save Settings to persist.`);
    }
  };

  const confirmBuddy = async () => {
    try {
      setBuddy(pendingBuddy);

      if (!hasServerRecord) {
        // Create new student record with buddy
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
        // Update existing student record with new buddy
        const payload = {
          profile: {
            name: name ?? "",
            ttsEnabled: Boolean(ttsEnabled),
            theme: theme || "indigo",
          },
          interests: Array.isArray(interests) ? interests : [],
          buddy: pendingBuddy ? { id: pendingBuddy.id, name: pendingBuddy.name, img: pendingBuddy.img } : null,
        };
        
        console.log("💾 Updating buddy in database:", { 
          studentId: serverStudentId, 
          buddy: pendingBuddy 
        });
        
        await api.patch(`/student/${serverStudentId}`, payload);
        setBuddyModal(false);
        message.success?.(`Buddy updated: ${pendingBuddy.name}`);
      }

      initialRef.current = { ...initialRef.current, buddy: pendingBuddy };
    } catch (error) {
      console.error("❌ Failed to update buddy:", error);
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
        relative bg-gradient-to-br from-gray-50 to-gray-100
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

      {/* Main Tabs */}
      <Card className="rounded-2xl shadow-lg border-0">
        <Tabs
          defaultActiveKey="profile"
          size="large"
          items={[
            {
              key: "profile",
              label: (
                <span className="flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  Profile
                </span>
              ),
              children: (
                <div className="py-4">
                  {/* Profile Overview */}
                  <div className={`p-6 bg-gradient-to-br ${themePreview} rounded-2xl text-white mb-6`}>
                    <Row align="middle" gutter={[16, 16]}>
                      <Col xs={24} sm="auto">
                        <div className="flex justify-center">
                          <Badge dot={isDirty} color="#52c41a">
                            <img
                              src={displayBuddy?.img || "/src/assets/buddies/kibundo-buddy.png"}
                              alt={displayBuddy?.name || "Learning Buddy"}
                              width={avatarSize}
                              height={avatarSize}
                              className="border-4 border-white shadow-lg object-contain rounded-2xl"
                              onError={(e) => {
                                e.target.src = "/src/assets/buddies/kibundo-buddy.png";
                              }}
                            />
                          </Badge>
                        </div>
                      </Col>
                      <Col flex="auto">
                        <Title level={2} className="!mb-2 !text-white">
                          {name || defaultName || "Student"}
                        </Title>
                        <Text className="text-white/90 text-lg">
                          Student ID: {userId || "N/A"}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  {/* Profile Form */}
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : (
                    <div className="space-y-6">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Text strong className="text-base">Display Name</Text>
                            <Tooltip title="Contact your teacher or admin to change your name">
                              <Input
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl"
                                size="large"
                                disabled
                                prefix={<User2 className="h-4 w-4 text-gray-400" />}
                              />
                            </Tooltip>
                          </div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Text strong className="text-base">Student ID</Text>
                            <Input 
                              value={userId || "N/A"} 
                              disabled 
                              className="rounded-xl" 
                              size="large"
                            />
                          </div>
                        </Col>
                      </Row>

                      <Divider />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <Text strong className="flex items-center gap-2 text-base">
                              <Volume2 className="h-5 w-5" />
                              Text-to-Speech
                            </Text>
                            <Text type="secondary" className="block mt-1">
                              Enable voice feedback from your buddy
                            </Text>
                          </div>
                          <Switch checked={ttsEnabled} onChange={setTTSEnabled} size="large" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "appearance",
              label: (
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Appearance
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <Title level={4} className="!mb-4">Color Theme</Title>
                    <Segmented
                      block
                      value={theme}
                      onChange={(val) => setTheme(val)}
                      options={THEMES.map((t) => ({
                        label: <ThemeOption value={t.value} label={t.label} />,
                        value: t.value,
                      }))}
                      className="!rounded-xl"
                      size="large"
                    />
                    <Alert
                      message="Theme Preview"
                      description="Your selected theme will be applied across the entire application."
                      type="info"
                      icon={<Info className="h-4 w-4" />}
                      showIcon
                      className="rounded-xl mt-4"
                    />
                  </div>

                  <Divider />

                  {/* Learning Buddy */}
                  <div>
                    <Title level={4} className="!mb-4 flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      Learning Buddy
                    </Title>
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4 flex-wrap">
                        <img
                          src={displayBuddy?.img || "/src/assets/buddies/kibundo-buddy.png"}
                          alt={displayBuddy?.name || "Learning Buddy"}
                          width={80}
                          height={80}
                          className="border-2 border-gray-200 object-contain rounded-xl"
                          onError={(e) => {
                            e.target.src = "/src/assets/buddies/kibundo-buddy.png";
                          }}
                        />
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2 mb-1">
                            <Title level={5} className="!mb-0">
                              {displayBuddy?.name || "No buddy selected"}
                            </Title>
                            {isPreviewingBuddy && (
                              <Tag color="blue">Preview</Tag>
                            )}
                          </div>
                          <Text type="secondary" className="block mb-3">
                            Pick a friend to guide you through your learning journey
                          </Text>
                          <Button 
                            type="primary" 
                            className="rounded-xl" 
                            onClick={() => setBuddyModal(true)} 
                            icon={<Edit className="h-4 w-4" />}
                          >
                            Change Buddy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "academic",
              label: (
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                  ) : (
                    <>
                      {/* Quick Stats */}
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-blue-100 bg-blue-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Class</Text>}
                              value={studentData?.class?.class_name || studentData?.class_name || "N/A"}
                              prefix={<GraduationCap className="h-5 w-5 text-blue-600" />}
                              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#1890ff" }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-green-100 bg-green-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Subjects</Text>}
                              value={studentData?.subject?.length || 0}
                              prefix={<BookOpen className="h-5 w-5 text-green-600" />}
                              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#52c41a" }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-purple-100 bg-purple-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Parent</Text>}
                              value={
                                studentData?.parent?.user
                                  ? [studentData.parent.user.first_name, studentData.parent.user.last_name]
                                      .filter(Boolean)
                                      .join(" ") || "Linked"
                                  : "N/A"
                              }
                              prefix={<Users className="h-5 w-5 text-purple-600" />}
                              valueStyle={{ fontSize: 16, fontWeight: 700, color: "#722ed1" }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Divider />

                      {/* Enrolled Subjects */}
                      <div>
                        <Title level={4} className="!mb-4">Enrolled Subjects</Title>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const subjects = studentData?.subject || studentData?.subjects || [];
                            
                            if (!Array.isArray(subjects) || subjects.length === 0) {
                              return (
                                <Tag color="default" className="text-sm px-4 py-2 rounded-xl">
                                  No subjects enrolled
                                </Tag>
                              );
                            }
                            
                            return subjects.map((s, index) => {
                              const subjectName = 
                                s?.subject?.subject_name ||
                                s?.subject?.name || 
                                s?.Subject?.subject_name ||
                                s?.Subject?.name ||
                                s?.subject_name ||
                                s?.name ||
                                (typeof s === 'string' ? s : null);
                              
                              if (!subjectName) return null;
                              
                              return (
                                <Tag key={s?.id || index} color="green" className="text-base px-4 py-2 rounded-xl">
                                  {subjectName}
                                </Tag>
                              );
                            }).filter(Boolean);
                          })()}
                        </div>
                      </div>

                      {/* Parent/Guardian Info */}
                      <div>
                        <Title level={4} className="!mb-4">Parent/Guardian</Title>
                        <Card className="rounded-xl bg-gray-50">
                          <Text className="text-gray-700 text-base">
                            {studentData?.parent?.user
                              ? [studentData.parent.user.first_name, studentData.parent.user.last_name].filter(Boolean).join(" ") ||
                                studentData.parent.user.email ||
                                "N/A"
                              : "No parent/guardian linked"}
                          </Text>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: "interests",
              label: (
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Interests
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <Title level={4} className="!mb-0">My Interests</Title>
                    <Button 
                      type="primary" 
                      className="rounded-xl" 
                      onClick={() => navigate("/student/onboarding/interests")}
                    >
                      Run Interests Wizard
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-2xl min-h-[100px]">
                    {(interests || []).length === 0 ? (
                      <Text type="secondary" className="text-base">
                        No interests yet — add some below to personalize your learning experience
                      </Text>
                    ) : (
                      (interests || []).map((it) => (
                        <Tag
                          key={it}
                          closable
                          onClose={(e) => {
                            e.preventDefault();
                            removeInterest(it);
                          }}
                          className="rounded-full px-4 py-2 text-base"
                          color="blue"
                        >
                          {it}
                        </Tag>
                      ))
                    )}
                  </div>

                  <div>
                    <Text strong className="block mb-2 text-base">Add New Interest</Text>
                    <Space.Compact className="w-full" size="large">
                      <Input
                        value={interestDraft}
                        onChange={(e) => setInterestDraft(e.target.value)}
                        placeholder="E.g., Dinosaurs, Space, Art..."
                        className="rounded-l-xl"
                        onPressEnter={addInterest}
                      />
                      <Button type="primary" onClick={addInterest} className="rounded-r-xl">
                        Add
                      </Button>
                    </Space.Compact>
                  </div>
                </div>
              ),
            },
            {
              key: "account",
              label: (
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  <Alert
                    message="Account Settings"
                    description="Manage your account preferences and sign out options"
                    type="info"
                    showIcon
                    className="rounded-xl"
                  />

                  <Card className="rounded-xl bg-red-50 border-red-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <Title level={5} className="!mb-1 !text-red-700">Sign Out</Title>
                        <Text type="secondary">Sign out from this device</Text>
                      </div>
                      <Button 
                        icon={<LogOut className="h-4 w-4" />} 
                        danger 
                        onClick={doLogout} 
                        className="rounded-xl"
                        size="large"
                      >
                        Log Out
                      </Button>
                    </div>
                  </Card>

                  <Card className="rounded-xl">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <Title level={5} className="!mb-1">Reset Settings</Title>
                        <Text type="secondary">Clear all local settings and preferences</Text>
                      </div>
                      <Button 
                        onClick={resetAll} 
                        className="rounded-xl" 
                        danger 
                        type="default"
                        size="large"
                      >
                        Reset Local Data
                      </Button>
                    </div>
                  </Card>
                </div>
              ),
            },
          ]}
        />
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
