// src/pages/student/learning/SubjectDetail.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Typography, Tag, Button, Skeleton, Alert } from "antd";
import { ArrowLeft, Wand2 } from "lucide-react";
import { getSubjectPlan } from "@/api/learning.js";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";

const { Title, Text } = Typography;

export default function SubjectDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subject = (params.get("subject") || "math").toLowerCase();

  const { buddy } = useStudentApp();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getSubjectPlan({ subject });
        setPlan(data);
      } catch (e) {
        setError("Could not load suggestions right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, [subject]);

  return (
    <div className="px-3 md:px-6 py-4 bg-gradient-to-b from-white to-neutral-50 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0 capitalize">{subject} — Buddy Picks</Title>
      </div>

      <Card className="rounded-2xl mb-3">
        <div className="flex items-start gap-3">
          <BuddyAvatar src={buddy?.img || "https://placekitten.com/200/220"} size={72} />
          <div className="flex-1">
            <Title level={5} className="!mb-1">Personalized plan</Title>
            <Text type="secondary">
              Your buddy looked at your skills and picked a few quick wins. Finish these to unlock more areas on the map!
            </Text>
          </div>
        </div>
      </Card>

      {error && (
        <Alert type="error" message={error} className="rounded-2xl mb-3" />
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton active key={i} className="rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Skill snapshot */}
          <Card className="rounded-2xl mb-3">
            <div className="text-sm text-neutral-600 mb-2">Skill snapshot (lower = bigger gap):</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(plan.profile.skills).map(([k, v]) => (
                <Tag key={k} className="rounded-full">
                  {k.replaceAll("_", " ")}: {(v * 100).toFixed(0)}%
                </Tag>
              ))}
            </div>
          </Card>

          {/* Suggestions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.suggestions.map((ex) => (
              <Card
                key={ex.id}
                hoverable
                className="rounded-2xl overflow-hidden border-0 shadow-sm"
                styles={{ body: {{ padding: 0 }}
                onClick={() => navigate(`/student/learning/exercise/${ex.id}?subject=${subject}`)}
              >
                <img src={ex.thumbnail} alt={ex.title} className="w-full h-32 object-cover" />
                <div className="px-3 py-3">
                  <div className="text-xs text-neutral-500 mb-1 capitalize">{subject}</div>
                  <div className="font-semibold">{ex.title}</div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    <Tag className="rounded-full">{ex.skill.replaceAll("_", " ")}</Tag>
                    <Tag className="rounded-full" color="blue">Lvl {ex.difficulty}</Tag>
                  </div>
                  <Button type="primary" size="small" className="rounded-xl mt-2" icon={<Wand2 className="w-4 h-4" />}>
                    Start
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
