// src/pages/OnboardingAddMoreStudent.jsx
import { useCallback } from "react";
import { Button, Card } from "antd";
import { Link, useNavigate } from "react-router-dom";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import Mascot from "@/components/Mascot";

export default function OnboardingAddMoreStudent() {
  const navigate = useNavigate();

  const goAddStudent = useCallback(() => {
    // adjust route if your add-student path differs
    navigate("/onboarding/add-student");
  }, [navigate]);

  return (
    <GradientShell>
      <TopBar title="Add Another Student" />

      <div className="mt-4 px-5 text-center">
        <Mascot name="Kibu" mood="happy" />

        <h2 className="mt-4 text-2xl font-extrabold text-[#6D8F00]">
          Add another student profile
        </h2>

        <p className="mt-2 text-neutral-100/90">
          You can add multiple students. Each additional student has discounted pricing.
        </p>

        <Card className="mx-auto mt-6 max-w-sm rounded-3xl shadow-lg border-0">
          <div className="space-y-3">
            <Button
              size="large"
              className="h-12 w-full rounded-full bg-[#FF7A1A] text-white border-none hover:!bg-[#ff8a3a]"
              onClick={goAddStudent}
            >
              Add Student
            </Button>

            {/* Optional secondary action to manage existing students */}
            <Link to="/parent/students" className="block">
              <Button
                size="large"
                className="h-12 w-full rounded-full bg-white text-[#FF7A1A] border border-[#FF7A1A] hover:!bg-[#fff5ee]"
              >
                Manage Students
              </Button>
            </Link>
          </div>
        </Card>

        <div className="mt-6">
          <Link to="/parent/dashboard">
            <Button
              size="large"
              className="h-12 w-40 rounded-full bg-[#FF7A1A]/90 text-white border-none hover:!bg-[#ff8a3a]"
            >
              Skip
            </Button>
          </Link>
        </div>

        {/* Small print */}
        <p className="mt-4 text-xs text-neutral-200">
          You can add or remove students anytime from your Parent Dashboard.
        </p>
      </div>
    </GradientShell>
  );
}
