// src/pages/student/StudentSettings.jsx
import { useMemo, useState } from "react";
import { Card, Typography, Input, Button, Space, Tag, Switch, Radio, Modal, message } from "antd";
import { ArrowLeft, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

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

export default function StudentSettings() {
  const navigate = useNavigate();
  const {
    buddy, setBuddy,
    interests, setInterests,
    profile, setProfile, // { name, ttsEnabled, theme }
  } = useStudentApp();

  // local working copies (optimistic UI)
  const [name, setName] = useState(profile?.name || "");
  const [ttsEnabled, setTTSEnabled] = useState(Boolean(profile?.ttsEnabled));
  const [theme, setTheme] = useState(profile?.theme || "indigo");
  const [interestDraft, setInterestDraft] = useState("");
  const [buddyModal, setBuddyModal] = useState(false);
  const [pendingBuddy, setPendingBuddy] = useState(buddy || BUDDIES[0]);

  const themePreview = useMemo(() => {
    // simple mapping for a header gradient preview
    const map = {
      indigo: "from-indigo-50 to-indigo-100",
      emerald: "from-emerald-50 to-emerald-100",
      rose: "from-rose-50 to-rose-100",
      amber: "from-amber-50 to-amber-100",
      sky: "from-sky-50 to-sky-100",
    };
    return map[theme] || map.indigo;
  }, [theme]);

  const saveProfile = () => {
    setProfile({ name, ttsEnabled, theme });
    message.success("Settings saved!");
  };

  const addInterest = () => {
    const v = interestDraft.trim();
    if (!v) return;
    if ((interests || []).includes(v)) {
      message.info("Already added.");
      return;
    }
    setInterests([...(interests || []), v]);
    setInterestDraft("");
  };

  const removeInterest = (val) => {
    setInterests((arr) => (arr || []).filter((x) => x !== val));
  };

  const confirmBuddy = () => {
    setBuddy(pendingBuddy);
    setBuddyModal(false);
    message.success(`Buddy set to ${pendingBuddy.name}`);
  };

  const resetAll = () => {
    try {
      localStorage.removeItem("kibundo_buddy");
      localStorage.removeItem("kibundo_interests");
      localStorage.removeItem("kibundo_profile");
    } catch {}
    // reset in context too
    setBuddy(null);
    setInterests([]);
    setProfile({ name: "", ttsEnabled: false, theme: "indigo" });
    setName("");
    setTTSEnabled(false);
    setTheme("indigo");
    message.success("All student data reset on this device.");
  };

  return (
    <div className="px-3 md:px-6 py-4 bg-gradient-to-b from-white to-neutral-50 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">Student Settings</Title>
      </div>

      {/* Theme preview strip */}
      <div className={`rounded-2xl p-3 mb-4 bg-gradient-to-br ${themePreview}`}>
        <div className="flex items-center gap-3">
          <BuddyAvatar src={(buddy?.img) || "https://placekitten.com/200/206"} size={72} />
          <div>
            <div className="text-sm text-neutral-600">Theme preview</div>
            <div className="font-semibold">{name || "Your Name"}</div>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">Profile</Title>
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
            <div className="text-sm text-neutral-600 mb-1">Text-to-Speech (Buddy voice)</div>
            <div className="flex items-center gap-2">
              <Switch checked={ttsEnabled} onChange={setTTSEnabled} />
              <Text type="secondary">{ttsEnabled ? "Enabled" : "Disabled"}</Text>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm text-neutral-600 mb-1">Color theme</div>
          <Radio.Group
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="flex flex-wrap gap-2"
          >
            {THEMES.map((t) => (
              <Radio.Button key={t.value} value={t.value} className="rounded-xl">
                {t.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        <div className="mt-3">
          <Button type="primary" className="rounded-xl" onClick={saveProfile}>
            Save Settings
          </Button>
        </div>
      </Card>

      {/* Buddy Card */}
      <Card className="rounded-2xl mb-3">
        <Title level={5} className="!mb-2">Buddy</Title>
        <div className="flex items-center gap-3">
          <BuddyAvatar src={(buddy?.img) || "https://placekitten.com/200/207"} size={64} />
          <div className="flex-1">
            <div className="font-semibold">{buddy?.name || "No buddy selected yet"}</div>
            <Text type="secondary">Pick a monster friend to guide you.</Text>
          </div>
          <Button className="rounded-xl" onClick={() => setBuddyModal(true)}>Change</Button>
        </div>
      </Card>

      {/* Interests Card */}
      <Card className="rounded-2xl mb-3">
        <div className="flex items-center justify-between">
          <Title level={5} className="!mb-2">Interests</Title>
          <Button
            type="default"
            icon={<Wand2 className="w-4 h-4" />}
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
                onClose={(e) => { e.preventDefault(); removeInterest(it); }}
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
          <Button type="primary" onClick={addInterest} className="rounded-r-xl">Add</Button>
        </Space.Compact>
      </Card>

      {/* Danger zone */}
      <Card className="rounded-2xl border-red-200">
        <Title level={5} className="!mb-2 text-red-600">Danger Zone</Title>
        <Text type="secondary">This will remove your buddy, interests, and settings on this device.</Text>
        <div className="mt-2">
          <Button danger onClick={resetAll} className="rounded-xl">Reset local student data</Button>
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
              className={`text-left rounded-xl border-2 p-2 transition ${pendingBuddy?.id === b.id ? "border-blue-500" : "border-transparent hover:border-neutral-200"}`}
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
