import { LeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export default function TopBar({ title = "", onBack, right = null }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 py-4">
      <button
        className="rounded-full bg-white/70 backdrop-blur px-2 py-1 shadow"
        onClick={() => (onBack ? onBack() : nav(-1))}
        aria-label="Back"
      >
        <LeftOutlined />
      </button>
      <h1 className="text-2xl font-extrabold tracking-wide text-[#6B543B]">{title}</h1>
      <div className="ml-auto">{right}</div>
    </div>
  );
}
