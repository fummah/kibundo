import { Card } from "antd";
import { Check } from "lucide-react";

export default function InterestCard({
  label,
  mode="text",          // "text" | "color" | "image"
  color,                 // for mode=color
  imageSrc,              // for mode=image
  selected=false,
  onClick,
}) {
  const ring = selected ? "ring-2" : "";
  const borderColor = selected ? "var(--kib-primary)" : "transparent";

  return (
    <button onClick={onClick} className="w-full text-left kib-focus">
      <Card hoverable className={`relative rounded-2xl ${ring}`} styles={{ body: { padding: 16 } }} style={{ borderColor }}>
        {mode === "color" && (
          <div className="h-14 rounded-xl" style={{ background: color }} />
        )}

        {mode === "image" && (
          <div className="h-[210px] rounded-2xl grid place-items-center bg-[#f6ded6]">
            {imageSrc ? <img src={imageSrc} alt={label} className="h-[140px] object-contain" /> : <div className="text-lg font-semibold">{label}</div>}
          </div>
        )}

        {mode === "text" && (
          <div className="text-lg font-semibold">{label}</div>
        )}

        {selected && (
          <div className="absolute top-2 right-2 bg-[var(--kib-primary)] text-white rounded-full p-1 shadow">
            <Check className="w-4 h-4" />
          </div>
        )}
      </Card>
      {mode === "image" && <div className="text-center font-extrabold mt-2 text-[#5b4f3f]">{label}</div>}
    </button>
  );
}
