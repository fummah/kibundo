// src/components/StatCard.jsx
export default function StatCard({
  label,
  value,
  hint,
  tone,          // e.g., "#F06D67" or "rgb(25,183,201)"
  invert = false, // white text on colored bg
  className = "",
}) {
  const style = tone ? { background: tone } : undefined;
  const base =
    "rounded-2xl p-4 shadow " +
    (invert ? "text-white" : "bg-white text-gray-900");

  return (
    <div className={`${base} ${className}`} style={style}>
      <div className={invert ? "text-white/80 text-sm" : "text-gray-500 text-sm"}>
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? (
        <div className={invert ? "text-white/70 text-xs mt-1" : "text-gray-400 text-xs mt-1"}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
