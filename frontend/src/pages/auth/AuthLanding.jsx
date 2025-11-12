import { useNavigate } from "react-router-dom";
import { Button, Typography } from "antd";
import heroImage from "@/assets/onboarding-dino.png";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";

const { Title, Text } = Typography;

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
        fontFamily: NUNITO_FONT_STACK,
      }}
    >
      <div className="pointer-events-none absolute inset-x-[-40%] bottom-[-60%] h-[130%] rounded-[50%] bg-[#F2E5D5]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-10 text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <img
            src={heroImage}
            alt="Kibundo Buddy"
            style={{ width: "201px", height: "412px" }}
            className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          />

          <div className="space-y-3 max-w-xl">
            <Title
              level={1}
              className="!m-0 text-4xl font-bold tracking-[0.08em] md:text-5xl"
              style={{ color: "#FF7F32", fontSize: "60px" }}
            >
              Kibundo
            </Title>
            <Text
              className="block text-base font-medium md:text-lg"
              style={{ color: "#31A892" }}
            >
              Hausaufgaben mit Spaß – Eltern, Kinder und Lehrkräfte wachsen gemeinsam.
            </Text>
            <Text className="block text-sm md:text-base text-[#5A4C3A]">
              Entdecke unsere spielerischen Lernwelten, begleite dein Kind bei Hausaufgaben
              und erhalte smarte Einblicke in Fortschritt, Motivation und Lernerfolge.
            </Text>
          </div>
        </div>

        <div className="w-full max-w-md rounded-[32px] bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <Title level={3} className="!mb-4 text-center text-2xl font-semibold text-[#5A4C3A]">
            Los geht&apos;s
          </Title>
          <div className="grid gap-3">
            <Button
              type="primary"
              size="large"
              className="w-full rounded-full border-none bg-[#FF7F32] text-lg font-semibold tracking-wide shadow-lg transition hover:bg-[#ff6c12]"
              onClick={() => navigate("/signup")}
            >
              Kostenlos testen
            </Button>
            <Button
              size="large"
              className="w-full rounded-full border-none bg-[#F6F1E8] text-lg font-semibold text-[#5A4C3A] shadow-inner transition hover:bg-white hover:shadow-md"
              onClick={() => navigate("/signin")}
            >
              Bereits registriert? Anmelden
            </Button>
          </div>

          <DividerText />
          <Text className="block text-center text-xs text-[#8A8075]">
            Lehrer oder Schule?{" "}
            <span
              className="cursor-pointer font-semibold text-[#FF7F32] hover:underline"
              onClick={() => navigate("/signin")}
            >
              Kontaktiere uns für Zugang
            </span>
          </Text>
        </div>
      </div>
    </div>
  );
}

function DividerText() {
  return (
    <div className="my-4 flex items-center gap-4">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E5D7C9] to-transparent" />
      <span className="text-xs uppercase tracking-[0.3em] text-[#8A8075]">oder</span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E5D7C9] to-transparent" />
    </div>
  );
}
