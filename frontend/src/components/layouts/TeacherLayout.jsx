import { Outlet } from "react-router-dom";
import GlobalNavBar from "../layouts/GlobalNavBar";
import TeacherSidebar from "../sidebars/TeacherSidebar";

export default function TeacherLayout() {
  return (
    <div className="flex h-screen">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalNavBar />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



