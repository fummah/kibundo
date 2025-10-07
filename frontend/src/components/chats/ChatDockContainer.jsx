import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useChatDock } from "@/context/ChatDockContext";
import ChatLayer from "@/components/student/mobile/ChatLayer";

/**
 * ChatDockContainer
 * - Anchored inside the parent shell instead of the global viewport.
 * - Covers roughly 3/4 (75%) of the parent shell height from the bottom.
 * - Renders into #chat-root if present, else attaches to the shell container.
 */
export default function ChatDockContainer() {
  const { state, minimizeChat, closeChat } = useChatDock();
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState(null);

  // Mount inside shell container (fallback to body if not found)
  useEffect(() => {
    // Try ParentShell wrapper first
    const shell = document.querySelector("#parent-shell, .ParentShell, .DeviceFrame");
    const el = document.getElementById("chat-root") || shell || document.body;
    setContainer(el);
    setMounted(true);
  }, []);

  // Smooth hide animation handling
  const [shouldRender, setShouldRender] = useState(false);
  useEffect(() => {
    if (state?.visible) {
      setShouldRender(true);
    } else {
      const t = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [state?.visible]);

  if (!mounted || !container || !shouldRender) return null;

  return createPortal(
    <div
      className="absolute inset-x-0 bottom-0 z-[60] pointer-events-none"
      style={{
        height: "75%",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="relative h-full w-full overflow-hidden pointer-events-auto">
        <ChatLayer
          key={state?.mode ?? "chat"}
          onClose={() => {
            try {
              minimizeChat?.();
              closeChat?.();
            } catch {}
          }}
        />
      </div>
    </div>,
    container
  );
}
