// src/pages/student/reading/ReadingQuizFlow.jsx
import { useEffect, useRef, useState } from "react";
import { Card, Typography, Radio, Button, Space, Rate, message, Row, Col } from "antd";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
import { ChatStripSpacer } from "@/components/student/mobile/FooterChat";

import { fetchReadingQuiz } from "@/api/reading.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;

export default function ReadingQuizFlow() {
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [ans, setAns] = useState({});
  const [score, setScore] = useState(null);
  const flushedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await fetchReadingQuiz({ level: 2 });
      setQ(data);
    })();
  }, []);

  const { running, elapsedMs, start, pause, reset, flush } = useTaskTimer(
    "reading:quiz",
    { mode: "reading_quiz", level: 2 },
    true
  );

  useEffect(() => {
    return () => {
      if (!flushedRef.current) {
        flush("abandoned", {
          answered: Object.keys(ans).length,
          total: q?.items?.length || 0,
        });
        flushedRef.current = true;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ans]);

  const submit = () => {
    if (!q) return;
    let s = 0;
    q.items.forEach((it, i) => {
      if (ans[i] === it.correct) s++;
    });
    setScore(s);
    message.success(`You got ${s}/${q.items.length}!`);
    flush("completed", { score: s, total: q.items.length, elapsedMs });
    flushedRef.current = true;
    pause();
  };

  const resetAll = () => {
    setAns({});
    setScore(null);
    reset();
  };

  const hhmmss = new Date(elapsedMs).toISOString().substr(11, 8);

  return (
    // Scrollable in ALL views; in desktop DeviceFrame use h-full
    <div className="relative mx-auto w-full max-w-4xl px-3 md:px-6 py-4 overflow-y-auto min-h-[100svh] lg:min-h-0 lg:h-full">
      {/* Header with Back + GreetingBanner + Timer */}
      <div className="flex items-center gap-3 pt-6 mb-4">
        <BackButton
          className="p-2 rounded-full hover:bg-neutral-100 active:scale-95"
          aria-label="Back"
        />
        <div className="flex-1">
          <GreetingBanner
            title="Reading Quiz"
            subtitle="Answer the questions below."
            className="!bg-white"
            translucent={false}
          />
        </div>
        <div className="text-xs text-neutral-500 whitespace-nowrap">⏱ {hhmmss}</div>
      </div>

      {!q ? (
        <Card className="rounded-2xl">Loading…</Card>
      ) : (
        <>
          {/* Passage with its own scroll if long */}
          <Card className="rounded-2xl mb-3">
            <div className="whitespace-pre-wrap leading-7 max-h-[50vh] md:max-h-[40vh] overflow-auto pr-1">
              <Text>{q.passage}</Text>
            </div>
          </Card>

          {/* Questions — page itself scrolls; options wrap cleanly */}
          <Row gutter={[16, 16]}>
            {q.items.map((it, idx) => (
              <Col key={idx} xs={24}>
                <Card className="rounded-2xl">
                  <Text strong className="block mb-2">
                    {idx + 1}. {it.q}
                  </Text>
                  <Radio.Group
                    onChange={(e) => setAns({ ...ans, [idx]: e.target.value })}
                    value={ans[idx]}
                    className="flex flex-col gap-2"
                  >
                    {it.options.map((op, i) => (
                      <Radio
                        key={i}
                        value={i}
                        className="rounded-xl px-2 py-2 bg-neutral-50 whitespace-normal break-words leading-6"
                      >
                        {op}
                      </Radio>
                    ))}
                  </Radio.Group>
                </Card>
              </Col>
            ))}
          </Row>

          <Space className="mt-3" wrap>
            <Button type="primary" onClick={submit} className="rounded-xl">
              Submit
            </Button>
            {!running ? (
              <Button onClick={start} className="rounded-xl">Resume</Button>
            ) : (
              <Button onClick={pause} className="rounded-xl">Pause</Button>
            )}
            <Button onClick={resetAll} className="rounded-xl">Reset</Button>
          </Space>

          {score !== null && (
            <Card className="rounded-2xl mt-3">
              <Title level={5} className="!mb-1">How was it?</Title>
              <Text type="secondary">
                Rate this quiz so your buddy can pick better ones next time.
              </Text>
              <div className="mt-2">
                <Rate />
              </div>
            </Card>
          )}
        </>
      )}

      {/* Keep content above the chat footer across all views */}
      <ChatStripSpacer />
    </div>
  );
}
