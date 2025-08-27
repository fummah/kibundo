// src/pages/student/homework/HomeworkMain.jsx
import { Button, Typography, Card } from "antd";
import { CameraOutlined, AudioOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
// ✅ Explicit extensions to avoid 404s with Vite dynamic imports
import BigTile from "@/components/student/BigTile.jsx";
import ChatLayer from "@/components/student/ChatLayer.jsx";

const { Title, Text } = Typography;

function StepBadge({ n, label, active }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 rounded-full grid place-items-center text-white text-lg shadow ${
          active ? "bg-orange-500" : "bg-gray-300"
        }`}
      >
        {n}
      </div>
      <div className="mt-1 text-xs font-medium text-neutral-700">{label}</div>
    </div>
  );
}

export default function HomeworkMain() {
  const navigate = useNavigate();

  return (
    <div className="px-3 md:px-6 py-4">
      {/* ---------------- MOBILE — client style ---------------- */}
      <div className="md:hidden">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-100 to-sky-100 p-5">
          <div className="flex items-center justify-between">
            <Title level={4} className="!mb-0 text-emerald-700">
              Homework
            </Title>
            <div className="w-9 h-9 rounded-full grid place-items-center bg-white/80">⚙️</div>
          </div>

          <div className="flex justify-center my-3">
            <BuddyAvatar size={96} />
          </div>

          <div className="text-center text-sm text-neutral-700 mb-2">Your steps:</div>
          <div className="flex items-center justify-between px-2">
            <StepBadge n={1} label="Collect" active />
            <div className="h-1 bg-gray-300 flex-1 mx-2 rounded" />
            <StepBadge n={2} label="Do" />
            <div className="h-1 bg-gray-300 flex-1 mx-2 rounded" />
            <StepBadge n={3} label="Report" />
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<CameraOutlined />}
              onClick={() => navigate("/student/homework/interaction")}
            />
            <Button
              shape="circle"
              size="large"
              icon={<AudioOutlined />}
              onClick={() => navigate("/student/homework/interaction")}
            />
          </div>
        </div>
      </div>

      {/* ---------------- DESKTOP — colorful but familiar ---------------- */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 mb-4">
          <BuddyAvatar size={56} />
          <div>
            <Title level={4} className="!mb-0">
              Homework Support
            </Title>
            <Text type="secondary">Scan worksheet, get help, then send report.</Text>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-md">
          <div className="flex items-center gap-10">
            <StepBadge n={1} label="Collect" active />
            <div className="h-1 bg-gray-300 flex-1 rounded" />
            <StepBadge n={2} label="Do" />
            <div className="h-1 bg-gray-300 flex-1 rounded" />
            <StepBadge n={3} label="Report" />
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => navigate("/student/homework/interaction")}
            >
              Start with Camera
            </Button>
            <Button
              icon={<AudioOutlined />}
              onClick={() => navigate("/student/homework/interaction")}
            >
              Talk to Buddy
            </Button>
          </div>
        </Card>
      </div>

      {/* ---------------- Common: Action tiles + Coach bubble ---------------- */}
      <div className="mt-6 grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        <BigTile
          img="https://picsum.photos/seed/homework-start/600/400"
          title="Start: Add Homework"
          subtitle="Photo, voice or text"
          onClick={() => navigate("/student/homework/interaction")}
        />
        <BigTile
          img="https://picsum.photos/seed/homework-tasks/600/400"
          title="My Tasks"
          subtitle="Open tasks & status"
          onClick={() => navigate("/student/homework/tasks")}
        />
      </div>

      <div className="mt-4">
        <ChatLayer
          message="Ready? Tap ‘Start: Add Homework’ and show your worksheet to your buddy."
          tts={false}
        />
      </div>
    </div>
  );
}
