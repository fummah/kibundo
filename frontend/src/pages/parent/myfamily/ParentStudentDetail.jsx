// src/pages/parent/myfamily/ParentStudentDetail.jsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Checkbox, message } from "antd";
import { StarFilled, ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import api from "@/api/axios";
import childOne from "@/assets/parent/childone.png";
import childTwo from "@/assets/parent/childtwo.png";
import { formatDayLabel } from "@/utils/dateFormat";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";
import ParentSpaceBar from "@/components/parent/ParentSpaceBar.jsx";
import PlainBackground from "@/components/layouts/PlainBackground.jsx";

/* ---------- Progress bars component ---------- */
function ProgressBars({ data, labels }) {
  const cols = data?.length || 14;

  return (
    <div className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
      <div className="text-neutral-700 font-bold mb-2">14 Days Progress</div>

      {/* Bars row */}
      <div
        className="h-36 grid items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {data.map((b, i) => {
          const barBase =
            "w-4 md:w-5 rounded-md shadow-sm border transition-colors duration-200";
          const color =
            b.highlight === "orange"
              ? "bg-orange-500 border-orange-500"
              : b.highlight === "pink"
              ? "bg-rose-400 border-rose-400"
              : "bg-white border-black/10";
          return (
            <div key={i} className="flex items-end justify-center">
              <div
                className={`${barBase} ${color}`}
                style={{ height: `${Math.max(8, Math.min(100, b.value))}%` }}
                aria-label={`Day ${i + 1} value ${b.value}`}
              />
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {labels.map((lbl, i) => {
          const [dow, day] = String(lbl).split(/\s+/); // e.g., "Mo." "10"
          return (
            <div key={i} className="text-center leading-tight">
              <div className="text-[11px] sm:text-[12px] text-neutral-600 whitespace-nowrap">
                {dow || ""}
              </div>
              <div className="text-[11px] sm:text-[12px] text-neutral-500 whitespace-nowrap">
                {day || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ParentStudentDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [savingInterests, setSavingInterests] = useState(false);

  // Fetch student data and usage stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch student details
        const studentRes = await api.get(`/student/${id}`);
        const studentData = studentRes.data;
        setStudent(studentData);
        // Initialize interests from student data
        const studentInterests = Array.isArray(studentData?.interests) ? studentData.interests : [];
        setSelectedInterests(studentInterests);

        // Fetch student usage statistics
        try {
          const statsRes = await api.get(`/student/${id}/usage-stats`);
          setUsageStats(statsRes.data);
        } catch (statsError) {
          console.warn("Could not fetch usage stats:", statsError);
          // Set default stats if endpoint doesn't exist yet
          setUsageStats({
            stats: {
              lessonsCompleted: 0,
              timeSpent: "0h 0m",
            },
            progress: {
              bars: Array(14).fill({ value: 0 }),
              labels: [],
            },
            activities: [],
            recentScans: [],
          });
        }

        // Fetch parent's subscription to show actual plan
        try {
          // Get current user to find parent_id
          const userRes = await api.get("/current-user");
          const userId = userRes.data?.id;
          
          if (userId) {
            // Get parent record
            const parentRes = await api.get("/parents", { params: { user_id: userId } });
            const parents = Array.isArray(parentRes.data) ? parentRes.data : (parentRes.data?.data || []);
            const parent = parents.find(p => p.user_id === userId) || parents[0];
            
            if (parent?.id) {
              // Get subscriptions
              try {
                const subsRes = await api.get("/subscriptions", { params: { parent_id: parent.id } });
                const subs = Array.isArray(subsRes.data) ? subsRes.data : (subsRes.data?.data || []);
                
                // Normalize status check
                const normalizeStatus = (status) => {
                  if (!status) return null;
                  const s = String(status).toLowerCase();
                  return s === "active" || s === "trialing" ? "active" : s;
                };
                
                // Find active subscription (active or trialing status)
                let activeSub = subs.find(s => {
                  const status = normalizeStatus(s.status);
                  return status === "active" || status === "trialing";
                }) || subs.find(s => normalizeStatus(s.status) !== "canceled" && normalizeStatus(s.status) !== "past_due");
                
                // If subscription found but product data is missing, fetch product details
                if (activeSub && activeSub.plan_id && !activeSub.product) {
                  try {
                    const productRes = await api.get(`/products/${activeSub.plan_id}`);
                    activeSub.product = productRes.data;
                  } catch (productErr) {
                    console.warn("Could not fetch product details:", productErr);
                  }
                }
                
                if (activeSub) {
                  setSubscription(activeSub);
                }
              } catch (subErr) {
                console.warn("Could not fetch subscriptions:", subErr);
              }
            }
          }
        } catch (subError) {
          console.warn("Could not fetch subscription data:", subError);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Get avatar based on gender
  const getAvatarByGender = (gender) => {
    if (gender === "male") return childOne;
    if (gender === "female") return childTwo;
    return childOne; // Default fallback
  };

  // Use real progress data from API or fallback to dummy data
  const bars = useMemo(() => {
    if (usageStats?.progress?.bars && usageStats.progress.bars.length > 0) {
      return usageStats.progress.bars;
    }
    // Fallback dummy data
    const base = [48, 30, 78, 72, 28, 22, 61, 84, 95, 38, 59, 70, 46, 60];
    return base.map((v, i) => ({
      value: v,
      highlight: i === 8 ? "orange" : i === 9 ? "pink" : null,
    }));
  }, [usageStats]);

  // Use real day labels from API or generate fallback
  const dayLabels = useMemo(() => {
    if (usageStats?.progress?.labels && usageStats.progress.labels.length > 0) {
      return usageStats.progress.labels;
    }
    // Fallback: generate day labels
    const today = new Date();
    const lang = i18n?.language || "de";
    return Array.from({ length: 14 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - idx));
      return formatDayLabel(d, lang);
    });
  }, [usageStats, i18n?.language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-neutral-600">Loading student data...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-neutral-800 font-semibold">Student not found</div>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Extract student information from database
  const user = student?.user || {};
  const studentName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student";
  const studentAge = student?.age || null;
  const studentGender = user?.gender;
  const avatarSrc = user?.avatar || getAvatarByGender(studentGender);

  // Format age display
  const ageDisplay = studentAge ? `Age ${studentAge}` : "Age X";
  
  // Format grade/class display
  const gradeDisplay = student?.class?.class_name || 
                       student?.student?.class?.class_name || 
                       (student?.class_id ? `Grade ${student.class_id}` : null) ||
                       (student?.student?.class_id ? `Grade ${student.student.class_id}` : null) ||
                       "Grade N/A";
  
  // Format student ID display
  const studentIdDisplay = student?.id || 
                           student?.student_id || 
                           id || 
                           "N/A";

  return (
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10 pb-24">
          <div className="space-y-6">
        {/* Header with back button and centered title */}
        <div className="flex items-center justify-center relative mb-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            className="!p-0 !h-auto text-neutral-700 absolute left-0"
            aria-label="Back"
          />
          <h1 className="text-2xl font-extrabold text-neutral-800 mb-0 text-center">
            Dashboard
          </h1>
        </div>

        {/* Child Profile */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/60 shadow">
            <img
              src={avatarSrc}
              alt={studentName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-xl font-extrabold text-neutral-800">
              {studentName}
            </div>
            <div className="text-neutral-600">{ageDisplay}</div>
            <div className="text-neutral-600">{gradeDisplay}</div>
            <div className="text-neutral-600">ID: {studentIdDisplay}</div>
          </div>
        </div>

        {/* Actual Plan Section */}
        <div>
          <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
            Actual Plan
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              {subscription ? (
                <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-500 grid place-items-center">
                    <StarFilled />
                  </div>
                  <div>
                    <div className="text-rose-500 font-bold leading-tight">
                      {subscription.status === 'trialing' ? 'Trialing' : 
                       subscription.status === 'active' ? 'Active' : 
                       subscription.status === 'past_due' ? 'Past Due' :
                       subscription.status === 'canceled' ? 'Canceled' : 
                       'Inactive'}
                    </div>
                    <div className="text-neutral-600 text-[13px]">
                      {(() => {
                        const productName = subscription.product?.name || 'Premium Plan';
                        let metadata = subscription.product?.metadata;
                        // Handle metadata as string (needs parsing)
                        if (typeof metadata === 'string') {
                          try {
                            metadata = JSON.parse(metadata);
                          } catch (e) {
                            metadata = {};
                          }
                        }
                        const interval = metadata?.billing_interval || 'month';
                        const intervalText = interval === 'year' ? 'jährlich' : 
                                            interval === 'month' ? 'monatlich' : 
                                            interval === 'week' ? 'wöchentlich' : 
                                            'monatlich';
                        return `${productName} ${intervalText}`;
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-white/80 backdrop-blur rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-400 grid place-items-center">
                    <StarFilled />
                  </div>
                  <div>
                    <div className="text-gray-500 font-bold leading-tight">
                      No Active Plan
                    </div>
                    <div className="text-neutral-600 text-[13px]">
                      No subscription found
                    </div>
                  </div>
                </div>
              )}
            </div>
            {subscription && (() => {
              let metadata = subscription.product?.metadata;
              if (typeof metadata === 'string') {
                try {
                  metadata = JSON.parse(metadata);
                } catch (e) {
                  metadata = {};
                }
              }
              return metadata?.billing_interval !== 'year';
            })() && (
              <Button 
                className="shrink-0 bg-lime-400 hover:bg-lime-500 border-none text-neutral-900 rounded-xl"
                onClick={() => navigate("/parent/billing/subscription")}
              >
                Change to yearly
              </Button>
            )}
          </div>
        </div>

        {/* Activity Section */}
        <div>
          <h2 className="text-xl font-extrabold text-neutral-800 mb-3">Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl px-4 py-4 shadow-sm border border-white/70 bg-[#F2787E] text-white">
              <div className="text-[15px] font-semibold opacity-90 mb-1">
                Lessons Completed
              </div>
              <div className="text-5xl font-extrabold tracking-tight leading-none">
                {usageStats?.stats?.lessonsCompleted ?? 0}
              </div>
            </div>
            <div className="rounded-2xl px-4 py-4 shadow-sm border border-white/70 bg-[#11C0C6] text-white">
              <div className="text-[15px] font-semibold opacity-90 mb-1">
                Time Spent Learning
              </div>
              <div className="text-5xl font-extrabold tracking-tight leading-none">
                {usageStats?.stats?.timeSpent ?? "0h 0m"}
              </div>
            </div>
          </div>
        </div>

        {/* 14 Days Progress */}
        <ProgressBars data={bars} labels={dayLabels} />

        {/* Recent Activities */}
        {usageStats?.activities && usageStats.activities.length > 0 && (
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
              Recent Activities
            </h2>
            <div className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
              <div className="space-y-2">
                {usageStats.activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {activity.tag}
                      </span>
                      <span className="text-neutral-700">{activity.text}</span>
                    </div>
                    <span className="text-xs text-neutral-500">{activity.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        {usageStats?.recentScans && usageStats.recentScans.length > 0 && (
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
              Recent Homework Scans
            </h2>
            <div className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
              <div className="space-y-2">
                {usageStats.recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-700 font-medium">{scan.title}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        scan.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500">{scan.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fokusthemen (Focus Topics) Section */}
        <div>
          <h2 className="text-xl font-extrabold text-neutral-800 mb-2">
            Fokusthemen
          </h2>
          <div className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
            <div className="text-neutral-800 font-bold mb-2">
              Fokusthemen
            </div>
            <div className="text-neutral-700 mb-3">
              Wähle zwei Schwerpunkte aus:
            </div>
            <Checkbox.Group
              value={selectedInterests}
              onChange={async (vals) => {
                // Strictly enforce 2 selection limit
                if (vals.length > 2) {
                  message.warning("Bitte wähle höchstens zwei Schwerpunkte.");
                  return; // block extra selection
                }
                setSelectedInterests(vals);
                // Auto-save interests
                if (id && vals.length <= 2) {
                  setSavingInterests(true);
                  try {
                    await api.patch(`/student/${id}`, {
                      interests: vals,
                    });
                    message.success("Fokusthemen erfolgreich gespeichert!");
                  } catch (err) {
                    console.error("Error saving interests:", err);
                    message.error("Fehler beim Speichern der Fokusthemen.");
                    // Revert on error
                    setSelectedInterests(selectedInterests);
                  } finally {
                    setSavingInterests(false);
                  }
                }
              }}
              className="grid gap-2"
              disabled={savingInterests}
            >
              <Checkbox 
                value="math"
                disabled={selectedInterests.length >= 2 && !selectedInterests.includes("math")}
              >
                Mathe
              </Checkbox>
              <Checkbox 
                value="german"
                disabled={selectedInterests.length >= 2 && !selectedInterests.includes("german")}
              >
                Deutsch
              </Checkbox>
              <Checkbox 
                value="nature"
                disabled={selectedInterests.length >= 2 && !selectedInterests.includes("nature")}
              >
                Natur und Umwelt
              </Checkbox>
              <Checkbox 
                value="concentration"
                disabled={selectedInterests.length >= 2 && !selectedInterests.includes("concentration")}
              >
                Konzentration
              </Checkbox>
            </Checkbox.Group>
          </div>
        </div>

          </div>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </PlainBackground>
  );
}
