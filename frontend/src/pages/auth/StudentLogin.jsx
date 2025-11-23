// src/pages/auth/StudentLogin.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Button, Typography, Spin, Input } from "antd";
import { useAuthContext } from "@/context/AuthContext";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import api from "@/api/axios";
import heroImage from "@/assets/onboarding-dino.png";
import useEnsureGerman from "@/hooks/useEnsureGerman.js";
import { NUNITO_FONT_STACK } from "@/constants/fonts.js";
import { hasSeenIntro, hasDoneTour } from "@/pages/student/onboarding/introFlags";
import childOne from "@/assets/buddies/monster1.png";
import childTwo from "@/assets/buddies/monster21.png";
import { SearchOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function extractToken(resp) {
  const d = resp?.data || {};
  let t =
    d.token ??
    d.access_token ??
    d.jwt ??
    d?.data?.token ??
    d?.data?.access_token ??
    null;

  if (!t) {
    const authHeader =
      resp?.headers?.authorization ||
      resp?.headers?.Authorization ||
      d?.authorization;
    if (authHeader && typeof authHeader === "string") {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        t = parts[1];
      }
    }
  }
  return t || null;
}

function normalizeRoleId(user) {
  return Number(user?.role_id ?? user?.roleId ?? user?.role?.id ?? NaN);
}

export default function StudentLogin() {
  const ready = useEnsureGerman();
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  
  // Check for studentId in URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const studentIdParam = urlParams.get("studentId");
  
  // Try to get stored student preference
  const getStoredStudentId = () => {
    try {
      return localStorage.getItem("kibundo_student_id");
    } catch {
      return null;
    }
  };
  
  const storedStudentId = getStoredStudentId();
  const targetStudentId = studentIdParam || storedStudentId;

  // Fetch specific student if ID is provided, otherwise fetch all students
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoadingStudent(true);
        
        if (targetStudentId) {
          // Fetch specific student
          const response = await api.get("/auth/students-for-login");
          const studentList = response.data?.students || [];
          const foundStudent = studentList.find(s => 
            String(s.studentId) === String(targetStudentId) ||
            String(s.id) === String(targetStudentId)
          );
          
          if (foundStudent) {
            setStudent(foundStudent);
          } else {
            toast.error("Schüler nicht gefunden.");
            // Fall back to showing all students
            setStudent(null);
          }
        } else {
          // No specific student ID - show all students (fallback)
          const response = await api.get("/auth/students-for-login");
          const studentList = response.data?.students || [];
          // If only one student, show them directly
          if (studentList.length === 1) {
            setStudent(studentList[0]);
            // Store for future use
            try {
              localStorage.setItem("kibundo_student_id", String(studentList[0].studentId || studentList[0].id));
            } catch {}
          } else {
            // Multiple students - show selection (fallback to old behavior)
            setStudent(null);
          }
        }
      } catch (error) {
        console.error("Error fetching student:", error);
        toast.error("Fehler beim Laden der Schülerdaten.");
        setStudent(null);
      } finally {
        setLoadingStudent(false);
      }
    };
    fetchStudent();
  }, [targetStudentId]);

  const getDefaultAvatar = (student) => {
    if (student?.avatar) return student.avatar;
    if (student?.gender === 'male') return childOne;
    if (student?.gender === 'female') return childTwo;
    return childOne; // Default
  };

  const handleLogin = async () => {
    if (!student) {
      toast.error("Schüler nicht gefunden.");
      return;
    }

    try {
      setLoading(true);
      
      // Store student ID for future logins
      try {
        localStorage.setItem("kibundo_student_id", String(student.studentId || student.id));
      } catch {}
      
      const resp = await api.post("/auth/student-login", {
        studentId: student.studentId || student.id,
        name: student.name
      });
      
      const user = resp?.data?.user ?? resp?.data?.data?.user ?? null;
      const token = extractToken(resp);

      if (!user || !token) {
        toast.error("Anmeldung fehlgeschlagen.");
        return;
      }

      const roleId = normalizeRoleId(user);
      login(user, token);
      toast.success("Erfolgreich angemeldet!");

      // Student onboarding flow
      if (roleId === ROLES.STUDENT) {
        const studentId = user?.id || user?.user_id || null;
        if (!hasSeenIntro(studentId)) {
          navigate("/student/onboarding/welcome-intro", { replace: true });
          return;
        }
        if (!hasDoneTour(studentId)) {
          navigate("/student/onboarding/welcome-tour", { replace: true });
          return;
        }
      }

      const rolePath = ROLE_PATHS[roleId] || "/dashboard";
      navigate(rolePath, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Anmeldung fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div
        className="relative min-h-screen w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
          fontFamily: NUNITO_FONT_STACK,
        }}
      />
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #F8C9AA 0%, #F9E7D9 42%, #CBEADF 100%)",
        fontFamily: NUNITO_FONT_STACK,
      }}
    >
      <Toaster position="top-center" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <img
            src={heroImage}
            alt="Kibundo Buddy"
            style={{ width: "201px", height: "412px" }}
            className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          />
          <div className="space-y-3">
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
              Hausaufgaben mit Spaß
              <br />
              und in Deinem Tempo
            </Text>
          </div>
        </div>

        <div className="w-full max-w-md rounded-[32px] bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          {loadingStudent ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spin size="large" />
              <Text className="mt-4 text-[#8A8075]">Lade dein Profil...</Text>
            </div>
          ) : student ? (
            <>
              {/* Single student view - large avatar and direct login */}
              <div className="flex flex-col items-center">
                <Text className="mb-4 text-center text-base text-[#8A8075]">
                  Tippe auf dein Profilbild, um anzumelden
                </Text>
                
                {/* Large avatar - clickable to login directly */}
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="mb-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#FF7F32]/30"
                >
                  <div className="relative">
                    <img
                      src={getDefaultAvatar(student)}
                      alt={student.name}
                      className="w-40 h-40 rounded-full object-cover border-4 border-[#FF7F32] shadow-xl"
                      onError={(e) => {
                        e.currentTarget.src = childOne;
                      }}
                    />
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full backdrop-blur-sm">
                        <Spin size="large" />
                      </div>
                    )}
                    {/* Login indicator overlay */}
                    {!loading && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FF7F32] text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Anmelden
                      </div>
                    )}
                  </div>
                </button>
                
                <Text className="text-center text-lg font-semibold text-[#5A4C3A]">
                  {student.name}
                </Text>
              </div>
            </>
          ) : (
            <>
              {/* Fallback: Show all students if no specific student found */}
              <Title
                level={3}
                className="!mb-2 text-center text-2xl font-semibold text-[#5A4C3A]"
              >
                Wer bist du?
              </Title>
              <Text className="mb-6 block text-center text-sm text-[#8A8075]">
                Wähle dein Profilbild aus.
              </Text>
              <div className="text-center py-8 text-[#8A8075]">
                Bitte kontaktiere deine Eltern, um dein Profil einzurichten.
              </div>
            </>
          )}

          <div className="mt-4 text-center text-sm text-[#8A8075]">
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="font-semibold text-[#FF7F32] hover:underline"
            >
              Als Erwachsener anmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

