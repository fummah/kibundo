import { Link, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  StarOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const Item = ({ to, icon: Icon, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center flex-1 py-2 text-sm font-semibold ${
        active ? "text-[#6D8F00]" : "text-neutral-800"
      }`}
    >
      <Icon className="text-xl" />
      <span className="mt-1">{label}</span>
    </Link>
  );
};

export default function BottomNav() {
  return (
    <div className="desk fixed bottom-0 left-0 right-0 mx-auto max-w-[420px] rounded-t-2xl bg-[#C7D425] text-neutral-900 shadow-2xl">
      <div className="flex">
        <Item to="/parent/dashboard" icon={HomeOutlined} label="Home" />
        <Item to="/parent/students/add" icon={PlusCircleOutlined} label="Add" />
        <Item to="/parent/news" icon={ReadOutlined} label="News" />
        <Item to="/parent/student-dashboard" icon={StarOutlined} label="Progress" />
        <Item to="/parent/plans" icon={SettingOutlined} label="Plans" />
      </div>
    </div>
  );
}
