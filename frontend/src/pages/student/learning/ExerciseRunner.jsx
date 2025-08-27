// src/pages/student/learning/ExerciseRunner.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, Typography, Button, InputNumber, Space, Alert, message } from "antd";
import { ArrowLeft, Lightbulb, Check, X } from "lucide-react";
import { getExerciseById, submitExerciseResult, getSubjectPlan } from "@/api/learning.js";

const { Title, Text } = Typography;

export default function ExerciseRunner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const subject = (params.get("subject") || "math").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [ex, setEx] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [state, setState] = useState("working"); // working | correct | wrong | submitted
  const [nextPick, setNextPick] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const exercise = await getExerciseById(id, subject);
      setEx(exercise);
      setLoading(false);
    })();
  }, [id, subject]);

  const canSubmit = useMemo(() => ex && answer !== null && answer !== "", [ex, answer]);

  const check = () => {
    if (!canSubmit) return;
    const correct = Number(answer) === Number(ex.answer);
    setState(correct ? "correct" : "wrong");
  };

  const submit = async () => {
    const correct = state === "correct";
    await submitExerciseResult({ id: ex.id, correct });
    message.success(correct ? "Great job! ⭐" : "Good effort — keep going!");
    setState("submitted");

    // fetch a fresh pick after submit (adaptive)
    const plan = await getSubjectPlan({ subject });
    setNextPick(plan.suggestions[0]);
  };

  if (loading) {
    return <div className="px-3 md:px-6 py-4"><Card className="rounded-2xl">Loading…</Card></div>;
  }

  if (!ex) {
    return (
      <div className="px-3 md:px-6 py-4">
        <Card className="rounded-2xl">
          <Alert type="error" message="Exercise not found" />
          <Button className="rounded-xl mt-3" onClick={() => navigate(`/student/learning?subject=${subject}`)}>Back to {subject}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 md:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">{ex.title}</Title>
      </div>

      <Card className="rounded-2xl mb-3 overflow-hidden">
        <img src={ex.thumbnail} alt={ex.title} className="w-full h-40 object-cover" />
        <div className="mt-3">
          <div className="text-xs text-neutral-500 capitalize">{subject} • {ex.skill.replaceAll("_", " ")}</div>
          <Title level={5} className="!mb-1">Question</Title>
          <div className="text-lg">{ex.prompt}</div>
        </div>

        <div className="mt-4">
          <Title level={5} className="!mb-2">Your answer</Title>
          <Space>
            <InputNumber min={-9999} max={9999} step={1} value={answer} onChange={setAnswer} className="!rounded-xl w-28" />
            <Button type="primary" onClick={check} disabled={!canSubmit} className="rounded-xl">Check</Button>
          </Space>

          {state === "correct" && (
            <Alert
              type="success"
              showIcon
              className="rounded-xl mt-3"
              message="Correct! Nice focus."
            />
          )}
          {state === "wrong" && (
            <Alert
              type="warning"
              showIcon
              className="rounded-xl mt-3"
              message="Almost! Try again or use a hint."
            />
          )}
        </div>

        <div className="mt-3">
          <Button
            icon={<Lightbulb className="w-4 h-4" />}
            className="rounded-xl"
            onClick={() => message.info(ex.hint)}
          >
            Hint
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            type="primary"
            disabled={state !== "correct" && state !== "wrong"}
            onClick={submit}
            icon={state === "correct" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            className="rounded-xl"
          >
            {state === "correct" ? "Submit & Continue" : "Submit anyway"}
          </Button>
          <Button className="rounded-xl" onClick={() => navigate(`/student/learning?subject=${subject}`)}>
            Back to {subject}
          </Button>
        </div>
      </Card>

      {state === "submitted" && nextPick && (
        <Card className="rounded-2xl">
          <Title level={5} className="!mb-1">Next suggestion</Title>
          <Text type="secondary">Your buddy recommends this next:</Text>
          <div className="mt-3 flex items-center gap-3">
            <img src={nextPick.thumbnail} alt={nextPick.title} className="w-28 h-20 object-cover rounded-lg" />
            <div>
              <div className="font-semibold">{nextPick.title}</div>
              <div className="text-sm text-neutral-500">{nextPick.skill.replaceAll("_"," ")} • Lvl {nextPick.difficulty}</div>
              <div className="mt-2">
                <Button
                  type="primary"
                  className="rounded-xl"
                  onClick={() => navigate(`/student/learning/exercise/${nextPick.id}?subject=${subject}`)}
                >
                  Start next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
