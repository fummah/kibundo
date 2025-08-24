import { Outlet } from "react-router-dom";
import GlobalNavBar from "../layouts/GlobalNavBar";
import StudentSidebar from "../sidebars/StudentSidebar";


export default function StudentLayout() {
  return (
    <div className="flex h-screen">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalNavBar />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <Outlet /> {/* ✅ This is required */}
        </main>
      </div>
    </div>
  );
}
