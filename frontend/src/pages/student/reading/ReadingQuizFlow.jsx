import { useEffect, useRef, useState } from "react";
import { Card, Typography, Radio, Button, Space, Rate, message, Row, Col } from "antd";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchReadingQuiz } from "@/api/reading.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;

export default function ReadingQuizFlow() {
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [ans, setAns] = useState({});
  const [score, setScore] = useState(null);
  const flushedRef = useRef(false);

  useEffect(() => { (async () => setQ(await fetchReadingQuiz({ level: 2 })))(); }, []);

  const { running, elapsedMs, start, pause, reset, flush } = useTaskTimer(
    "reading:quiz",
    { mode: "reading_quiz", level: 2 },
    true
  );

  useEffect(() => {
    return () => {
      if (!flushedRef.current) {
        flush("abandoned", { answered: Object.keys(ans).length, total: q?.items?.length || 0 });
        flushedRef.current = true;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ans]);

  const submit = () => {
    if (!q) return;
    let s = 0;
    q.items.forEach((it, i) => { if (ans[i] === it.correct) s++; });
    setScore(s);
    message.success(`You got ${s}/${q.items.length}!`);
    flush("completed", { score: s, total: q.items.length, elapsedMs });
    flushedRef.current = true;
    pause();
  };

  return (
    <div className="px-3 md:px-6 py-4 mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">Reading Quiz</Title>
        <div className="ml-auto text-xs text-neutral-500">
          ⏱ {new Date(elapsedMs).toISOString().substr(11, 8)}
        </div>
      </div>

      {!q ? (
        <Card className="rounded-2xl">Loading…</Card>
      ) : (
        <>
          <Card className="rounded-2xl mb-3">
            <Text className="whitespace-pre-wrap">{q.passage}</Text>
          </Card>

          <Row gutter={[16, 16]}>
            {q.items.map((it, idx) => (
              <Col key={idx} xs={24}>
                <Card className="rounded-2xl">
                  <Text strong className="block mb-2">{idx + 1}. {it.q}</Text>
                  <Radio.Group
                    onChange={(e) => setAns({ ...ans, [idx]: e.target.value })}
                    value={ans[idx]}
                    className="flex flex-col gap-2"
                  >
                    {it.options.map((op, i) => (
                      <Radio key={i} value={i} className="rounded-xl px-2 py-2 bg-neutral-50">{op}</Radio>
                    ))}
                  </Radio.Group>
                </Card>
              </Col>
            ))}
          </Row>

          <Space className="mt-3" wrap>
            <Button type="primary" onClick={submit} className="rounded-xl">Submit</Button>
            {!running
              ? <Button onClick={start} className="rounded-xl">Resume</Button>
              : <Button onClick={pause} className="rounded-xl">Pause</Button>}
            <Button onClick={reset} className="rounded-xl">Reset</Button>
          </Space>

          {score !== null && (
            <Card className="rounded-2xl mt-3">
              <Title level={5} className="!mb-1">How was it?</Title>
              <Text type="secondary">Rate this quiz so your buddy can pick better ones next time.</Text>
              <div className="mt-2"><Rate /></div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
