// src/pages/student/HomeScreen.jsx
import { Card, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import {
  BookOutlined,
  ReadOutlined,
  ProjectOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

const { Title, Text } = Typography;

function BigTile({ icon, title, subtitle, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`text-left w-full ${className}`} aria-label={title}>
      <Card hoverable className="rounded-2xl overflow-hidden border-0 shadow-md bg-white/90">
        <div className="flex items-center gap-3 p-4">
          <div className="w-12 h-12 rounded-xl grid place-items-center bg-indigo-100 text-indigo-700 text-xl">
            {icon}
          </div>
          <div>
            <div className="font-semibold text-neutral-900">{title}</div>
            {subtitle && <div className="text-xs text-neutral-500">{subtitle}</div>}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { state } = useStudentApp();
  const buddy = state?.buddy;

  return (
    <div className="px-3 md:px-6 py-4">
      {/* MOBILE hero (client style) */}
      <div className="md:hidden">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100 to-emerald-100 p-5 relative">
          <div className="absolute right-4 top-3 text-xs bg-white/70 rounded-full px-3 py-1 shadow">Student</div>
          <div className="flex flex-col items-center">
            <img
              src={buddy?.avatar}
              alt="Buddy"
              className="w-28 h-28 object-contain mb-2 drop-shadow"
            />
            <Title level={4} className="!mb-0 text-emerald-800">Welcome back!</Title>
            <Text type="secondary">What would you like to do today?</Text>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <BigTile
              icon={<FileSearchOutlined />}
              title="Homework"
              subtitle="Scan & get help"
              onClick={() => navigate("/student/homework")}
              className="bg-orange-50"
            />
            <BigTile
              icon={<ReadOutlined />}
              title="Reading"
              subtitle="Practice & quizzes"
              onClick={() => navigate("/student/reading")}
              className="bg-sky-50"
            />
            <BigTile
              icon={<BookOutlined />}
              title="Learning"
              subtitle="Math, Science, more"
              onClick={() => navigate("/student/learning")}
              className="bg-emerald-50"
            />
            <BigTile
              icon={<ProjectOutlined />}
              title="Treasure Map"
              subtitle="Your progress"
              onClick={() => navigate("/student/map")}
              className="bg-indigo-50"
            />
          </div>
        </div>
      </div>

      {/* DESKTOP — your requested layout */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 mb-4">
          <BuddyAvatar size={56} />
          <div>
            <Title level={4} className="!mb-0">Hi there!</Title>
            <Text type="secondary">Ready for today’s mission?</Text>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigTile icon={<FileSearchOutlined />} title="Homework" onClick={() => navigate("/student/homework")} />
          <BigTile icon={<ReadOutlined />} title="Reading" onClick={() => navigate("/student/reading")} />
          <BigTile icon={<BookOutlined />} title="Learning" onClick={() => navigate("/student/learning")} />
          <BigTile icon={<ProjectOutlined />} title="Treasure Map" onClick={() => navigate("/student/map")} />
        </div>
      </div>
    </div>
  );
}
