import { useMemo, useState } from "react";
import { Card, Typography, Button } from "antd";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";

const { Title } = Typography;

const STEPS = [
  { id: "colors", title: "Which color do you like the most?", choices: ["Red","Blue","Green","Yellow"], grid: 2, style: "colors" },
  { id: "theme1", title: "What do you prefer? Unicorns or Dinosaurs?", choices: ["Unicorns","Dinosaurs"], grid: 2 },
  { id: "theme2", title: "What do you prefer? Robots or Wizards?", choices: ["Robots","Wizards"], grid: 2 },
  { id: "hobby1", title: "What do you enjoy doing?", choices: ["Drawing","Building (Lego)"], grid: 2 },
  { id: "world", title: "Which world is exciting to you?", choices: ["Outer Space","Underwater World"], grid: 2 },
  { id: "animals", title: "Which animals do you like?", choices: ["Dog / Cat / Rabbit","Snake / Spider / Turtle"], grid: 2 },
];

export default function InterestsWizard() {
  const navigate = useNavigate();
  const { buddy, interests, setInterests } = useStudentApp();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState(() => (interests?.length ? [...interests] : []));

  const step = STEPS[stepIdx];
  const canNext = useMemo(() => !!answers[stepIdx], [answers, stepIdx]);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(step.title);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const choose = (c) => {
    const next = [...answers];
    next[stepIdx] = c;
    setAnswers(next);
  };

  const onBack = () => {
    if (stepIdx === 0) return navigate(-1);
    setStepIdx((i) => i - 1);
  };

  const onNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else {
      setInterests(answers.filter(Boolean));
      navigate("/student/onboarding/success");
    }
  };

  return (
    <div className="px-3 md:px-6 py-4 min-h-[100dvh] bg-gradient-to-b from-white to-neutral-50">
      <div className="flex items-center gap-2 mb-2">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={onBack}><ArrowLeft className="w-5 h-5" /></button>
        <Title level={4} className="!mb-0">Interests</Title>
        <button className="ml-auto p-2 rounded-full hover:bg-neutral-100" onClick={speak} aria-label="Speak"><Volume2 className="w-5 h-5" /></button>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/201"} size={96} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{step.title}</div>
          <div className="text-neutral-600 text-sm">Step {stepIdx + 1} of {STEPS.length}</div>
        </div>
      </div>

      <div className={`grid ${step.grid === 2 ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
        {step.choices.map((c) => (
          <button key={c} onClick={() => choose(c)} className="w-full">
            <Card
              className={`rounded-2xl border-2 ${answers[stepIdx] === c ? "border-blue-500" : "border-transparent"} ${step.style === "colors" ? "" : "bg-neutral-50"}`}
              bodyStyle={{ padding: 18 }}
              hoverable
            >
              <div className="text-lg font-semibold text-left">
                {step.style === "colors" ? (
                  <div
                    className="h-14 rounded-xl"
                    style={{
                      background:
                        c === "Red" ? "#ef4444" :
                        c === "Blue" ? "#3b82f6" :
                        c === "Green" ? "#22c55e" : "#eab308"
                    }}
                  />
                ) : c}
              </div>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Button onClick={onBack} className="rounded-xl">Back</Button>
        <Button type="primary" disabled={!canNext} onClick={onNext} className="rounded-xl">Next</Button>
      </div>
    </div>
  );
}
