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
} from "antd";
import { Wand2, Palette, Volume2, LogOut, User2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

const { Title, Text } = Typography;

const BUDDIES = [
  { id: "m1", name: "Milo", img: "https://placekitten.com/200/200" },
  { id: "m2", name: "Lumi", img: "https://placekitten.com/201/200" },
  { id: "m3", name: "Zuzu", img: "https://placekitten.com/202/200" },
  { id: "m4", name: "Kiko", img: "https://placekitten.com/203/200" },
  { id: "m5", name: "Pipa", img: "https://placekitten.com/204/200" },
  { id: "m6", name: "Nori", img: "https://placekitten.com/205/200" },
];

const THEMES = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "sky", label: "Sky" },
];

const THEME_GRADIENT = {
  indigo: "from-indigo-50 to-indigo-100",
  emerald: "from-emerald-50 to-emerald-100",
  rose: "from-rose-50 to-rose-100",
  amber: "from-amber-50 to-amber-100",
  sky: "from-sky-50 to-sky-100",
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
  // Safe fallback if App.useApp isn't mounted yet
  const { message } =
    App.useApp?.() ?? { message: { success: () => {}, error: () => {}, info: () => {} } };

  const { buddy, setBuddy, interests, setInterests, profile, setProfile } = useStudentApp();

  // Logged-in user (for API ID)
  const auth = useAuthContext?.();
  const { user, logout, signOut } = auth || {};
  const userId = user?.id ?? user?._id ?? user?.user_id ?? null;

  const defaultName = useMemo(() => {
    return (
      profile?.name ||
      user?.first_name ||
      user?.name ||
      (user?.email ? user.email.split("@")[0] : "") ||
      ""
    );
  }, [profile?.name, user]);

  // local working copies
  const [name, setName] = useState(defaultName);
  const [ttsEnabled, setTTSEnabled] = useState(Boolean(profile?.ttsEnabled));
  const [theme, setTheme] = useState(profile?.theme || "indigo");
  const [interestDraft, setInterestDraft] = useState("");
  const [buddyModal, setBuddyModal] = useState(false);
  const [pendingBuddy, setPendingBuddy] = useState(buddy || BUDDIES[0]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // whether a server record already exists
  const [hasServerRecord, setHasServerRecord] = useState(false);
  const [serverStudentId, setServerStudentId] = useState(null);

  // baseline for "dirty" detection
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

  /* ---------------------- Load settings (NO 404s) ----------------------
     Strategy:
       1) Pull /allstudents and try to find a record linked to the logged-in user.
       2) If found, GET /student/:id.
       3) If not found, do NOT call /student/:userId (which caused the 404).
  --------------------------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const sid = (obj) => obj?.id ?? obj?._id ?? obj?.student_id;

    const load = async () => {
      try {
        setLoading(true);

        // Step 1: find the student's server id without triggering 404s
        const allRes = await api.get("/allstudents", {
          // tolerate non-200s without throwing; we'll handle below
          validateStatus: (s) => s >= 200 && s < 500,
        });

        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const match = all.find(
          (s) =>
            s?.user?.id === userId ||
            s?.user_id === userId ||
            sid(s) === userId // in case the backend already uses userId as student id
        );

        if (!match) {
          // No record on server yet -> use local defaults; no failing requests
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          // baseline remains local
          initialRef.current = {
            name: defaultName ?? "",
            ttsEnabled: Boolean(profile?.ttsEnabled),
            theme: profile?.theme || "indigo",
            buddy: buddy ?? null,
          };
          return;
        }

        // Step 2: fetch the full student only when we have a known id
        const foundId = sid(match);
        const { data, status } = await api.get(`/student/${foundId}`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        if (status === 404 || !data) {
          // Unexpected: was listed but not fetchable; treat as no record (avoid throwing)
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          return;
        }

        if (cancelled) return;

        setHasServerRecord(true);
        setServerStudentId(foundId);

        // Normalize server response
        const srvProfile = data?.profile ?? {};
        const srvInterests = Array.isArray(data?.interests) ? data.interests : [];
        const srvBuddy = data?.buddy ?? null;

        // Update context + locals
        setProfile({
          name: srvProfile.name ?? "",
          ttsEnabled: Boolean(srvProfile.ttsEnabled),
          theme: srvProfile.theme || "indigo",
        });
        setInterests(srvInterests);
        setBuddy(srvBuddy);

        setName(srvProfile.name ?? defaultName ?? "");
        setTTSEnabled(Boolean(srvProfile.ttsEnabled));
        setTheme(srvProfile.theme || "indigo");
        setPendingBuddy(srvBuddy || BUDDIES[0]);

        // Reset baseline
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

  /* ---------------------- Create-on-first-save ---------------------- */
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
    <div className="relative px-3 md:px-6 py-4 bg-gradient-to-b from-white to-neutral-50 min-h-[100svh] lg:h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BackButton className="p-2 rounded-full hover:bg-neutral-100 active:scale-95" aria-label="Back" />
        <Title level={4} className="!mb-0">Settings</Title>
      </div>

      {/* Theme preview */}
      <div className={`rounded-2xl p-3 mb-4 bg-gradient-to-br ${themePreview}`}>
        <div className="flex items-center gap-3">
          <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/206"} size={72} />
          <div>
            <div className="text-xs text-neutral-600 flex items-center gap-1">
              <Palette className="h-3.5 w-3.5" /> Theme preview
            </div>
            <div className="font-semibold leading-tight">{name || defaultName || "Student"}</div>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ paddingTop: 16, paddingBottom: 16 }}>
        <div className="flex items-center justify-between mb-2">
          <Title level={5} className="!mb-0 flex items-center gap-2">
            <User2 className="h-4 w-4" /> Profile
          </Title>
          <Button
            type="primary"
            className="rounded-xl"
            onClick={saveProfileAll}
            loading={saving}
            disabled={saving || (!isDirty && hasServerRecord)}
          >
            Save
          </Button>
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-neutral-600 mb-1">Display name</div>
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <div className="text-sm text-neutral-600 mb-1 flex items-center gap-1">
                <Volume2 className="h-4 w-4" /> Text-to-Speech (Buddy voice)
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={ttsEnabled} onChange={setTTSEnabled} />
                <Text type="secondary">{ttsEnabled ? "Enabled" : "Disabled"}</Text>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-sm text-neutral-600 mb-1">Color theme</div>
              <Segmented
                value={theme}
                onChange={(val) => setTheme(val)}
                options={THEMES.map((t) => ({
                  label: <ThemeOption value={t.value} label={t.label} />,
                  value: t.value,
                }))}
                className="!rounded-xl"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Buddy Card */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ paddingTop: 16, paddingBottom: 16 }} loading={loading}>
        <div className="flex items-center gap-3">
          <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/207"} size={64} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{buddy?.name || "No buddy selected yet"}</div>
            <Text type="secondary">Pick a monster friend to guide you.</Text>
          </div>
          <Button className="rounded-xl" onClick={() => setBuddyModal(true)}>
            Change
          </Button>
        </div>
      </Card>

      {/* Interests Card */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ paddingTop: 16, paddingBottom: 16 }} loading={loading}>
        <div className="flex items-center justify-between">
          <Title level={5} className="!mb-2 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> Interests
          </Title>
          <Button
            type="default"
            className="rounded-xl"
            onClick={() => navigate("/student/onboarding/interests")}
          >
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
            className="rounded-xl"
            loading={saving}
            disabled={saving || (!isDirty && hasServerRecord)}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Account */}
      <Card className="rounded-2xl mb-3" bodyStyle={{ paddingTop: 16, paddingBottom: 16 }}>
        <Title level={5} className="!mb-2">Account</Title>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Text type="secondary">Sign out from this device.</Text>
          <Button icon={<LogOut className="h-4 w-4" />} danger onClick={doLogout} className="rounded-xl">
            Log out
          </Button>
        </div>
      </Card>

      {/* Buddy modal */}
      <Modal
        open={buddyModal}
        onCancel={() => setBuddyModal(false)}
        onOk={confirmBuddy}
        okText="Choose"
        className="rounded-2xl"
      >
        <Title level={5} className="!mb-3">Choose a Buddy</Title>
        <div className="grid grid-cols-2 gap-3">
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
