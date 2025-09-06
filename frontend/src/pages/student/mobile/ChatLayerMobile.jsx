// src/pages/student/mobile/ChatLayerMobile.jsx
import ChatLayer from "@/components/student/mobile/ChatLayer";

export default function ChatLayerMobile() {
  return (
    <ChatLayer
      minimiseTo="/student/home"        // or "/student/home-mobile"
      showHomeRibbon
      showSettingsRibbon
      headerHeight={200}
    />
  );
}
