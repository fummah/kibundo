// src/pages/student/reading/ReadingQuizFlow.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { Card, Typography, Radio, Button, Space, Rate, message, Row, Col, Image, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import GreetingBanner from "@/components/student/common/GreetingBanner.jsx";
// ChatStripSpacer removed - not needed

import { fetchReadingQuiz } from "@/api/reading.js";
import { useTaskTimer } from "@/hooks/useTaskTimer.js";

const { Title, Text } = Typography;

// Utility to randomize choices while tracking original indices
const randomizeChoices = (choices, randomize = true) => {
  if (!randomize || !Array.isArray(choices)) return choices.map((c, i) => ({ choice: c, originalIndex: i }));
  
  const indexed = choices.map((c, i) => ({ choice: c, originalIndex: i }));
  const shuffled = [...indexed];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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

  // Memoize randomized questions (only once on load)
  const randomizedItems = useMemo(() => {
    if (!q?.items) return [];
    return q.items.map(item => {
      // Check if item has options array with objects (new format) or strings (old format)
      const hasObjectOptions = Array.isArray(item.options) && item.options.some(o => typeof o === "object" && o !== null);
      
      if (hasObjectOptions) {
        // New format with image support
        const shouldRandomize = item.randomize !== false;
        const randomized = randomizeChoices(item.options, shouldRandomize);
        return { ...item, randomizedOptions: randomized };
      } else {
        // Old format - simple strings
        const options = Array.isArray(item.options) ? item.options : [];
        const randomized = randomizeChoices(options, true);
        return { ...item, randomizedOptions: randomized };
      }
    });
  }, [q]);

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
    randomizedItems.forEach((it, i) => {
      // Map user's answer back to original index to check correctness
      const userAnswerIndex = ans[i];
      if (userAnswerIndex !== undefined) {
        const originalIndex = it.randomizedOptions[userAnswerIndex]?.originalIndex;
        if (originalIndex === it.correct) s++;
      }
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
            {randomizedItems.map((it, idx) => (
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
                    {it.randomizedOptions.map((item, i) => {
                      const choice = item.choice;
                      const isObject = typeof choice === "object" && choice !== null;
                      const text = isObject ? choice.text : String(choice);
                      const imageUrl = isObject ? choice.image_url : null;
                      const tags = isObject && Array.isArray(choice.tags) ? choice.tags : [];

                      return (
                        <Radio
                          key={i}
                          value={i}
                          className="rounded-xl px-3 py-2 bg-neutral-50 whitespace-normal break-words leading-6"
                        >
                          <div className="flex flex-col gap-2">
                            <span>{text}</span>
                            {tags.length > 0 && (
                              <Space size="small" wrap>
                                {tags.map((tag, ti) => (
                                  <Tag key={ti} size="small" color="blue">{tag}</Tag>
                                ))}
                              </Space>
                            )}
                            {imageUrl && (
                              <div className="mt-1">
                                <Image
                                  src={imageUrl}
                                  alt={text}
                                  width={150}
                                  height={150}
                                  style={{ objectFit: "cover", borderRadius: 8 }}
                                />
                              </div>
                            )}
                          </div>
                        </Radio>
                      );
                    })}
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
    </div>
  );
}
