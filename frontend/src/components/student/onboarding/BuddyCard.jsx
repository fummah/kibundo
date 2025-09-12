import { Card } from "antd";
import { Check } from "lucide-react";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

export default function BuddyCard({ name, img, selected, onClick }) {
  return (
    <button onClick={onClick} className="text-left w-full kib-focus">
      <Card
        hoverable
        className={`rounded-2xl shadow-sm transition ${selected ? "ring-2" : ""}`}
        styles={{ body: { padding: 16 } }}
        style={{ borderColor: selected ? "var(--kib-primary)" : "transparent" }}
      >
        <div className="relative grid place-items-center">
          <BuddyAvatar src={img} size={96} />
          {selected && (
            <div className="absolute top-0 right-0 bg-[var(--kib-primary)] text-white rounded-full p-1 shadow">
              <Check className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="mt-3 font-semibold text-neutral-800 text-center">{name}</div>
      </Card>
    </button>
  );
}
