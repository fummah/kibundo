export default function GradientShell({ children, pad = true }) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#FAD6C7] via-[#F2E6D7] to-[#D3ECDC] text-neutral-800`}>
      <div className={`mx-auto w-full max-w-[2050px] ${pad ? "px-5 pb-8" : ""}`}>{children}</div>
    </div>
  );
}
