import { Link, useNavigate } from "react-router-dom";
import { Card, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import TopBar from "@/components/TopBar";
import dinoImg from "@/assets/onboarding-dino.png";  // ✅ imported here

export default function OnboardingAddMoreStudent() {
  const navigate = useNavigate();

  return (
    <GradientShell pad={false}>
      <div className="mobile-only">
        <TopBar title=" " showBack />
      </div>

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[28px] font-extrabold text-[#6e5e4e]">Los geht‘s</h1>

          {/* ✅ Fixed: now using imported image */}
          <div className="mt-2 mb-4 flex justify-center">
            <img
              src={dinoImg}
              alt="Kibundo Dino"
              className="w-44 h-44 object-contain drop-shadow"
            />
          </div>

          <h2 className="text-[22px] font-extrabold text-[#a7c600]">
            Weiteres Kind anlegen
          </h2>

          <p className="mt-2 text-[14px] leading-5 text-[#6f655a]">
            Du kannst für mehrere Kinder Konten hinzufügen.
            Das Hinzufügen ist jederzeit auch nachträglich möglich.
            Für jedes weitere Kind erhältst Du eine Vergünstigung.
          </p>

          <Card
            className="mt-5 rounded-2xl border-0 shadow-lg bg-white/85"
            styles={{ body: { padding: 18 } }}
          >
            <Link to="/parent/students/add" className="block">
              <div className="flex flex-col items-center gap-2">
                <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#ff8f3e] text-white shadow">
                  <PlusOutlined />
                </span>
                <span className="text-[16px] font-semibold text-[#6e5e4e]">
                  Kind hinzufügen
                </span>
              </div>
            </Link>
          </Card>

          <Button
            size="large"
            className="mt-5 w-full h-12 rounded-full bg-[#ff8f3e] text-white border-none hover:!bg-[#ff7a18]"
            onClick={() => navigate("/parent/dashboard")}
          >
            Skip
          </Button>
        </div>
      </div>
    </GradientShell>
  );
}
