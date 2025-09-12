export default function Halo({ active=false, children }) {
  return (
    <div className={`relative inline-grid place-items-center ${active ? "kib-pulse" : ""}`}>
      {active && <div className="absolute inset-[-10px] rounded-full ring-2" style={{ boxShadow:`0 0 0 6px ${'rgba(255,77,79,0.15)'}`, borderColor:"var(--kib-ring)" }}/>}
      {children}
    </div>
  );
}
