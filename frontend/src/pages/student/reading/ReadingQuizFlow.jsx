import { useEffect, useState } from "react";
import { Card, Typography, Radio, Button, Space, Rate, message } from "antd";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchReadingQuiz } from "@/api/reading.js";

const { Title, Text } = Typography;

export default function ReadingQuizFlow() {
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [ans, setAns] = useState({});
  const [score, setScore] = useState(null);

  useEffect(() => { (async () => setQ(await fetchReadingQuiz({ level: 2 })))(); }, []);

  const submit = () => {
    let s = 0;
    q.items.forEach((it, i) => { if (ans[i] === it.correct) s++; });
    setScore(s);
    message.success(`You got ${s}/${q.items.length}!`);
  };

  return (
    <div className="px-3 md:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 rounded-full hover:bg-neutral-100" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Title level={4} className="!mb-0">Reading Quiz</Title>
      </div>

      {!q ? (
        <Card className="rounded-2xl">Loading…</Card>
      ) : (
        <>
          <Card className="rounded-2xl mb-3">
            <Text className="whitespace-pre-wrap">{q.passage}</Text>
          </Card>

          {q.items.map((it, idx) => (
            <Card key={idx} className="rounded-2xl mb-3">
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
          ))}

          <Space className="mt-1">
            <Button type="primary" onClick={submit} className="rounded-xl">Submit</Button>
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
