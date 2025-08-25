// src/pages/SignupSuccess.jsx
import { useCallback } from "react";
import { Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import Mascot from "@/components/Mascot";

export default function SignupSuccess() {
  const navigate = useNavigate();

  const goAddStudent = useCallback(() => {
    // 🔧 Adjust if your route differs
    navigate("/parent/students/add");
  }, [navigate]);

  return (
    <GradientShell>
      <TopBar title="Success" />

      <div className="mt-4 px-5 text-center">
        <Mascot name="Kibu" mood="celebrate" />

        <h2 className="mt-3 text-2xl font-extrabold text-[#6D8F00]">
          Registration Complete
        </h2>

        <p className="mt-2 text-neutral-100/90">
          You’re ready to set up your students’ accounts.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            size="large"
            className="h-12 w-56 rounded-full bg-[#FF7A1A] text-white border-none hover:!bg-[#ff8a3a]"
            onClick={goAddStudent}
          >
            Continue
          </Button>

          {/* Optional secondary: go to dashboard */}
          <Link to="/parent/dashboard" className="block">
            <Button
              size="large"
              className="h-12 w-56 rounded-full bg-white text-[#FF7A1A] border border-[#FF7A1A] hover:!bg-[#fff5ee]"
            >
              Maybe later
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-neutral-200">
          You can add students anytime from your Parent Dashboard.
        </p>
      </div>
    </GradientShell>
  );
}
