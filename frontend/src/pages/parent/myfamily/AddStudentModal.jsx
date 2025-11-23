import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  List,
  Avatar,
  Button,
  Tag,
  Typography,
  Empty,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  NumberOutlined,
  PlusCircleFilled,
  LeftOutlined,
} from "@ant-design/icons";
import CircularBackground from "@/components/layouts/CircularBackground";

const { Text } = Typography;

// Feature flag: allow searching/linking students by ID/email in modal.
// Defaults to false; can be enabled via Vite env at build time.
const ALLOW_B2B_ID_SEARCH =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ALLOW_B2B_ID_SEARCH === "true") ||
  false;

/** Persist linked student ids for the mock flow */
const LS_KEY = "kib_parent_family_student_ids";

/** Dummy pool (some already linked elsewhere and should be hidden) */
export const DUMMY_STUDENTS = [
  { student_id: 1001, first_name: "Alex",   last_name: "Johnson",  status: "Active" },
  { student_id: 1002, first_name: "Priya",  last_name: "Singh",    status: "Active" },
  { student_id: 1003, first_name: "Marco",  last_name: "Rossi",    status: "Pending" },
  { student_id: 1004, first_name: "Lerato", last_name: "Mokoena",  status: "Active" },
  { student_id: 1005, first_name: "Aya",    last_name: "Tanaka",   status: "Inactive" },
  { student_id: 1006, first_name: "Noah",   last_name: "Meyer",    status: "Active" },
  { student_id: 1007, first_name: "Sara",   last_name: "Cohen",    status: "Active" },
  { student_id: 1008, first_name: "Diego",  last_name: "Martínez", status: "Pending" },
].map(s => ({
  ...s,
  // Mark some as linked for demo purposes
  isLinked: [1002, 1005].includes(s.student_id)
}));

function getLinkedSet() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return new Set(arr);
  } catch {
    return new Set();
  }
}
function addLinked(id) {
  const set = getLinkedSet();
  set.add(Number(id));
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width:700px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:700px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return isMobile;
}

export default function AddStudentModal({ open, onClose, onSuccess }) {
  const isMobile = useIsMobile();

  // Hook-safe state (no early returns)
  const [step, setStep] = useState("search"); // "intro" | "search"
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [alreadyLinkedMsg, setAlreadyLinkedMsg] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [hasTyped, setHasTyped] = useState(false);
  const [linkedSet, setLinkedSet] = useState(() => getLinkedSet());

  // Reset each time we open / breakpoint changes
  useEffect(() => {
    if (!open) return;
    setStep(isMobile ? "intro" : "search");
    setQ("");
    setResults([]);
    setAlreadyLinkedMsg("");
    setSubmittingId(null);
    setHasTyped(false);
    setLinkedSet(getLinkedSet()); // refresh snapshot from storage
  }, [open, isMobile]);

  // Only show students that are NOT already linked anywhere AND not selected previously by this parent
  const pool = useMemo(
    () => DUMMY_STUDENTS.filter((s) => !s.isLinked && !linkedSet.has(Number(s.student_id))),
    [linkedSet]
  );

  const computeResults = (query) => {
    const qtrim = (query ?? "").trim();
    setAlreadyLinkedMsg("");
    if (!qtrim) return [];

    const isEmail = qtrim.includes("@");
    const isNumericId = /^\d+$/.test(qtrim);
    const digits = qtrim.replace(/\D/g, "");
    const ql = qtrim.toLowerCase();

    const score = (s) => {
      let sc = 0;
      const sId = String(s.student_id);
      const email = String(s.email).toLowerCase();
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      if (isNumericId && sId === digits) sc += 100;
      if (isEmail && email === ql) sc += 100;
      if (isNumericId && sId.startsWith(digits)) sc += 60;
      if (isEmail && email.startsWith(ql)) sc += 60;
      if (!isNumericId && name.includes(ql)) sc += 40;
      if (!isEmail && email.includes(ql)) sc += 30;
      if (String(s.status).toLowerCase() === "active") sc += 5;
      return sc;
    };

    const ranked = pool
      .map((s) => ({ s, sc: score(s) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .map((x) => x.s);

    if (!ranked.length && isNumericId) {
      const linked = DUMMY_STUDENTS.find(
        (s) =>
          String(s.student_id) === digits &&
          (s.isLinked || linkedSet.has(Number(s.student_id)))
      );
      if (linked) setAlreadyLinkedMsg("This student is already linked to a family.");
    }
    return ranked.slice(0, 8);
  };

  // Debounced typeahead (only used if search is enabled later)
  useEffect(() => {
    if (!ALLOW_B2B_ID_SEARCH) return;
    const id = setTimeout(() => {
      if (!open) return;
      setResults(computeResults(q));
    }, 220);
    return () => clearTimeout(id);
  }, [q, open, pool]);

  const linkAndClose = async (student_id) => {
    try {
      setSubmittingId(student_id);
      await new Promise((r) => setTimeout(r, 250)); // simulate API
      addLinked(student_id); // persist in localStorage to keep state
      setLinkedSet(getLinkedSet());
      message.success("Student added to your family.");
      onSuccess?.({ student_id });
      onClose?.();
    } finally {
      setSubmittingId(null);
    }
  };

  const IntroPanel = () => (
    <CircularBackground>
      <div className="flex flex-col items-center text-center px-6">
        {/* Back button */}
        <div className="w-full flex items-start mb-4">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={onClose}
            className="!p-0 !h-auto text-neutral-700"
          />
        </div>

        {/* Header */}
        <h2 className="text-center text-[28px] font-extrabold text-neutral-800 mt-6">
          Add another student
        </h2>

        {/* Copy */}
        <p className="mx-auto mt-4 max-w-[640px] text-center text-[15px] md:text-[16px] text-neutral-600">
          You can add multiple student accounts, and add more later anytime.
        </p>

        {/* CTA */}
        <div className="mt-7 flex justify-center w-full">
          <button
            type="button"
            onClick={() => setStep("search")}
            className="group w-full max-w-[420px] rounded-[20px] bg-white shadow-[0_14px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 px-6 py-5 transition active:scale-[0.995] hover:shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
          >
            <div className="flex items-center gap-4 justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#ffa64d] to-[#ff7a1a] text-white shadow-[0_10px_18px_rgba(255,122,26,0.35)]">
                <PlusCircleFilled className="text-xl" />
              </span>
              <span className="text-[18px] md:text-[20px] font-extrabold text-orange-600 group-hover:text-orange-700">
                Add student
              </span>
            </div>
          </button>
        </div>

        {/* Skip button */}
        <div className="mt-4 flex justify-center w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full max-w-[420px] h-12 rounded-full bg-[#ff7a1a] text-white font-semibold shadow-[0_10px_24px_rgba(255,122,26,0.35)] active:scale-[0.995] transition hover:bg-[#e86d18]"
          >
            Skip
          </button>
        </div>
      </div>
    </CircularBackground>
  );

  const DisabledSearchPanel = () => (
    <CircularBackground>
      <div className="flex flex-col items-center text-center px-6">
        {/* Back button */}
        <div className="w-full flex items-start mb-4">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={onClose}
            className="!p-0 !h-auto text-neutral-700"
          />
        </div>

        <div className="w-full max-w-[420px]">
          <Text strong className="text-lg">Adding students</Text>
          <p className="mt-2 text-sm text-neutral-700">
            Please ask your student's teacher/school to send you an invite link.
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div>
              <div className="font-semibold">Invite from school</div>
              <div className="text-neutral-600">Use the invite link you receive to link your student.</div>
            </div>
          </div>
        </div>
      </div>
    </CircularBackground>
  );

  const EnabledSearchPanel = () => {
    const inputClass = "h-12 w-full rounded-2xl border border-[#E9DED2] bg-white px-4 text-base text-[#4F3A2D] placeholder:text-[#BCB1A8] shadow-[0_6px_16px_rgba(87,60,42,0.08)] focus:border-[#FF9A36] focus:shadow-[0_10px_24px_rgba(255,154,54,0.28)] transition";
    
    return (
      <CircularBackground>
        <div className="flex flex-col items-center px-6">
          {/* Back button */}
          <div className="w-full flex items-start mb-4">
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={onClose}
              className="!p-0 !h-auto text-neutral-700"
            />
          </div>

          <div className="w-full max-w-[420px] space-y-4">
            <h2 className="text-center text-[28px] font-extrabold text-neutral-800">
              Add Student
            </h2>
            
            <Input
              placeholder="Search by Student ID"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!hasTyped) setHasTyped(true);
              }}
              className={inputClass}
            />
            
            <div className="mt-8 sm:mt-10">
            {!q.trim() ? (
              <Empty description="Enter a Student ID to search" />
            ) : results.length ? (
              <List
                itemLayout="horizontal"
                dataSource={results}
                renderItem={(s, idx) => {
                  const isBusy = submittingId === s.student_id;
                  const active = String(s.status || "").toLowerCase() === "active";
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="select"
                          type="primary"
                          size="small"
                          loading={isBusy}
                          onClick={() => linkAndClose(s.student_id)}
                        >
                          Select
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {s.first_name} {s.last_name}
                            </span>
                            {idx === 0 && q.trim() && <Tag color="green">Most likely</Tag>}
                            <Tag color={active ? "blue" : "default"}>{s.status || "—"}</Tag>
                          </div>
                        }
                        description={
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span><NumberOutlined /> ID #{s.student_id}</span>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description={alreadyLinkedMsg || "No students found. Try another ID."} />
            )}
            </div>
          </div>
        </div>
      </CircularBackground>
    );
  };

  const SearchPanel = () =>
    ALLOW_B2B_ID_SEARCH ? <EnabledSearchPanel /> : <DisabledSearchPanel />;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered={!isMobile}
      title=""
      width={isMobile ? "100%" : 820}
      style={isMobile ? { top: 0, padding: 0, margin: 0 } : {}}
      getContainer={() => document.getElementById("chat-root") || document.body}
      destroyOnHidden
      maskClosable={false}
      rootClassName={`add-student-modal ${isMobile && step === "intro" ? "add-student-intro" : ""}`}
      footer={null}
      closable={false}
    >
      {isMobile && step === "intro" ? <IntroPanel /> : <SearchPanel />}
    </Modal>
  );
}
