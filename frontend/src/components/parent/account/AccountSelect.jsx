// C:\wamp64\www\kibundo\frontend\src\components\parent\account\AccountSelect.jsx

import { useEffect, useMemo, useState } from "react";
import { LeftOutlined } from "@ant-design/icons";
import { Spin, Modal, Input, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import buddyA from "@/assets/buddies/monster1.png";
import buddyB from "@/assets/buddies/monster2.png";
import globalBg from "@/assets/backgrounds/global-bg.png";

const fallbackBuddies = [buddyA, buddyB];

function formatName(user = {}) {
  const first = user.first_name || user.given_name || "";
  const last = user.last_name || user.family_name || "";
  const full = `${first} ${last}`.trim();
  return full || user.name || "Unbenannt";
}

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AccountSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccount, user } = useAuthContext();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [pendingAccount, setPendingAccount] = useState(null);

  const parentHome = useMemo(() => ROLE_PATHS[ROLES.PARENT] || "/parent", []);
  const studentHome = useMemo(() => ROLE_PATHS[ROLES.STUDENT] || "/student", []);

  const backDestination =
    location.state?.back || location.state?.parentNext || `${parentHome}/home`;
  const parentDestination =
    location.state?.parentNext || `${parentHome}/home`;
  const childDestination =
    location.state?.childNext || studentHome;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentUserRes = await api.get("/current-user");
        const currentUser = currentUserRes.data || {};

        let parentId = null;
        if (Array.isArray(currentUser?.parent) && currentUser.parent.length > 0) {
          parentId = currentUser.parent[0].id;
        } else if (currentUser?.parent?.id) {
          parentId = currentUser.parent.id;
        } else if (currentUser?.parent_id) {
          parentId = currentUser.parent_id;
        }

        let children = [];
        if (parentId) {
          const studentsRes = await api.get("/allstudents");
          const students = Array.isArray(studentsRes.data)
            ? studentsRes.data
            : studentsRes.data?.data || [];

          children = students
            .filter((s) => s.parent_id === parentId)
            .map((student, index) => {
              const studentUser = student.user || {};
              
              // Map character IDs to character images (from CharacterSelection onboarding)
              const characterImageMap = {
                1: "/images/img_rectangle_20.png",
                2: "/images/img_rectangle_20_264x174.png",
                3: "/images/img_rectangle_20_1.png",
                4: "/images/img_rectangle_20_2.png",
                5: "/images/img_rectangle_20_3.png",
                6: "/images/img_rectangle_20_4.png",
              };
              
              // Get characterSelection from interests (saved during onboarding)
              const interests = Array.isArray(student.interests) ? student.interests : [];
              const characterSelection = interests.find(
                (item) => item?.id === "characterSelection"
              );
              const characterId = characterSelection?.value || characterSelection?.id;
              const characterImg = characterId ? characterImageMap[characterId] : null;
              
              // Priority order for avatar:
              // 1. Selected character from CharacterSelection onboarding (characterSelection preference)
              // 2. User's avatar (selected during onboarding in CreateProfile)
              // 3. Default buddy images
              const userAvatar = studentUser.avatar || null;
              
              // Use character selection first, then user avatar, then default
              const avatar = characterImg || userAvatar || fallbackBuddies[index % fallbackBuddies.length];
              
              
              return {
                id: student.id,
                userId: studentUser.id || student.user_id,
                type: "child",
                name: formatName(studentUser) || `Kind ${index + 1}`,
                avatar: avatar,
                raw: student,
              };
            });
        }

        const parentAccount = {
          id: currentUser?.id || user?.id || "parent",
          type: "parent",
          name: formatName(currentUser) || "Parents",
          avatar: currentUser?.avatar || user?.avatar || fallbackBuddies[0],
          raw: currentUser,
        };

        if (mounted) {
          setAccounts([...children, parentAccount]);
        }
      } catch (err) {
        if (mounted) {
          setError("Konten konnten nicht geladen werden. Bitte versuche es erneut.");
          setAccounts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleBack = () => {
    if (location.state?.back) {
      navigate(location.state.back, {
        replace: true,
        state: location.state?.backState || {},
      });
    } else {
      navigate(-1);
    }
  };

  const handleSelect = (account) => {
    // If parent profile is selected, require password
    if (account.type === "parent") {
      setPendingAccount(account);
      setPasswordModalVisible(true);
      setPassword("");
      return;
    }

    // For children profiles, no password required - proceed directly
    if (typeof setAccount === "function") {
      setAccount(account);
    }
    navigate("/student/home", { replace: true });
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      message.error("Bitte geben Sie Ihr Passwort ein");
      return;
    }

    setVerifyingPassword(true);
    try {
      // Verify password by attempting to login with current user's email
      const currentUserRes = await api.get("/current-user");
      const currentUser = currentUserRes.data || {};
      const email = currentUser.email || currentUser.username || user?.email;

      if (!email) {
        message.error("Benutzer-E-Mail nicht gefunden");
        setVerifyingPassword(false);
        return;
      }

      // Verify password with backend
      const verifyRes = await api.post("/auth/login", {
        username: email,
        password: password,
      });

      if (verifyRes?.data?.user || verifyRes?.data?.token) {
        // Password is correct
        if (typeof setAccount === "function" && pendingAccount) {
          setAccount(pendingAccount);
        }
        setPasswordModalVisible(false);
        setPassword("");
        setPendingAccount(null);
        navigate(parentDestination, { replace: true });
      } else {
        message.error("Ungültiges Passwort");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        message.error("Ungültiges Passwort");
      } else {
        message.error("Fehler bei der Passwortprüfung. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordModalVisible(false);
    setPassword("");
    setPendingAccount(null);
  };

  const parentAccount = accounts.find((a) => a.type === "parent");
  const childAccounts = accounts.filter((a) => a.type !== "parent");

  const renderAvatar = (account, size = 75, ring = true, fallbackColor = "#E27474") => {
    const hasImg = !!account.avatar;
    const initials = getInitials(account.name || "");
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          overflow: "hidden",
          background: hasImg ? "#F7F1E8" : fallbackColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          boxShadow: ring ? "0 0 0 4px #F0E4D8" : "none",
        }}
      >
        {hasImg ? (
          <img
            src={account.avatar}
            alt={account.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontFamily: "Nunito",
              fontWeight: 800,
              fontSize: `${Math.floor(size * 0.4)}px`,
              color: "#FFFFFF",
            }}
          >
            {initials}
          </span>
        )}
      </div>
    );
  };

  const renderCard = (account, idx, background, accentColor = "#544C3B") => {
    const isParent = account.type === "parent";
    const avatarSize = isParent ? 46 : 75;
    const avatarRing = isParent ? false : true;
    const avatarColor = isParent ? "#FFFFFF" : "#F7F1E8";
    const textColor = isParent ? "#E27474" : accentColor;
    const nameSize = isParent ? "16px" : "18px";
    const nameWeight = isParent ? 700 : 900;
    return (
      <button
        key={`${account.type}-${account.id}`}
        type="button"
        onClick={() => handleSelect(account)}
        style={{
          width: "100%",
          minHeight: "95px",
          borderRadius: "16px",
          background,
          boxShadow: "2px 2px 5px rgba(0,0,0,0.25)",
          padding: "15px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          textAlign: "left",
        }}
      >
        {renderAvatar(account, avatarSize, avatarRing, isParent ? "#E27474" : avatarColor)}
        <div>
          <div
            style={{
              fontFamily: "Nunito",
              fontWeight: nameWeight,
              fontSize: nameSize,
              lineHeight: "1.364",
              color: isParent ? "#544C3B" : accentColor,
              marginBottom: isParent ? "0px" : "4px",
            }}
          >
            {account.name}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex justify-center overflow-hidden min-h-screen w-full relative">
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: "800px",
          minHeight: "1280px",
          padding: "169px 24px 24px",
          boxSizing: "border-box",
        }}
      >
        <div className="w-full" style={{ maxWidth: "752px", margin: "0 auto" }}>
          {/* Header row: back arrow left, title centered */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "24px",
              paddingBottom: "32px",
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              style={{
                position: "absolute",
                left: 0,
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#D9D9D9",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <LeftOutlined style={{ color: "#544C3B", fontSize: 18 }} />
            </button>

            <h1
              style={{
                fontFamily: "Nunito",
                fontWeight: 900,
                fontSize: "50px",
                lineHeight: "68px",
                letterSpacing: "2%",
                textAlign: "center",
                color: "#544C3B",
                margin: 0,
              }}
            >
              Account
            </h1>
          </div>

          {loading ? (
            <div className="mt-8 flex justify-center">
              <Spin size="large" />
            </div>
          ) : error ? (
            <div className="mt-24 rounded-3xl bg-white/90 p-6 text-center text-sm text-[#9A8576] shadow">
              {error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Kinder */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "12px 24px",
                  width: "100%",
                  boxSizing: "border-box",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "Nunito",
                    fontWeight: 900,
                    fontSize: "24px",
                    lineHeight: "1.364",
                    color: "#544C3B",
                    textAlign: "center",
                  }}
                >
                  Kinder
                </span>
                {childAccounts.length > 0 ? (
                  childAccounts.map((account, idx) =>
                    renderCard(account, idx, idx % 2 === 0 ? "#DCE5FF" : "#EFDCFF", "#544C3B")
                  )
                ) : (
                  <div
                    style={{
                      marginTop: "6px",
                      borderRadius: "28px",
                      background: "rgba(255,255,255,0.9)",
                      padding: "24px",
                      textAlign: "center",
                      fontFamily: "Nunito",
                      fontSize: "14px",
                      color: "#9A8576",
                      boxShadow: "0 12px 28px rgba(79,58,45,0.12)",
                    }}
                  >
                    Noch keine Konten gefunden. Lege zuerst ein Kinderkonto an.
                  </div>
                )}

                {/* Short info text directly under Kinder, as in Figma */}
                <p
                  style={{
                    marginTop: "16px",
                    fontFamily: "Nunito",
                    fontWeight: 400,
                    fontSize: "18px",
                    lineHeight: "1.364",
                    color: "#000000",
                    textAlign: "left",
                  }}
                >
                  Jedes Kind benötigt einen eigenen Account um eine individuell angepasste Lernerfahrung und optimale Ergebnisse zu erzielen.
                  <br />
                  Über die Settings können jederzeit weitere Kinder hinzugefügt werden.
                </p>
              </div>

              {/* Eltern */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "12px 24px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontFamily: "Nunito",
                    fontWeight: 900,
                    fontSize: "24px",
                    lineHeight: "1.364",
                    color: "#544C3B",
                    textAlign: "left",
                  }}
                >
                  Eltern
                </span>
                {parentAccount &&
                  renderCard(parentAccount, 0, "#FFFFFF", "#544C3B")}
              </div>

              {/* Info block */}
              <div
                style={{
                  padding: "0 24px",
                  boxSizing: "border-box",
                  textAlign: "center",
                  color: "#000000",
                  maxWidth: "704px",
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    fontFamily: "Nunito",
                    fontWeight: 900,
                    fontSize: "35px",
                    lineHeight: "1.364",
                    color: "#87A01D",
                    marginBottom: "16px",
                  }}
                >
                  Eltern und Kinder Devices
                </div>
                <p
                  style={{
                    fontFamily: "Nunito",
                    fontWeight: 400,
                    fontSize: "18px",
                    lineHeight: "1.364",
                    color: "#000000",
                    whiteSpace: "pre-line",
                  }}
                >
                  Es gibt zwei Möglichkeiten zur Nutzung.
                  {"\n"}Matheo und Stefanie können sich nun über ihren Kinderaccount sicher auf einem weiteren Device einloggen und Kibundo nutzen. Dazu müssen sich die Eltern auf dem weiteren Device einmalig einloggen.
                  {"\n"}Alternativ kann nun auch das aktuell genutzte Device an die Kinder übergeben werden.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Modal for Parent Profile */}
      <Modal
        title="Passwort erforderlich"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        confirmLoading={verifyingPassword}
        okText="Bestätigen"
        cancelText="Abbrechen"
        maskClosable={false}
      >
        <p className="mb-4 text-[#4F3A2D]">
          Bitte geben Sie Ihr Passwort ein, um auf das Elternprofil zuzugreifen.
        </p>
        <Input.Password
          placeholder="Passwort eingeben"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handlePasswordSubmit}
          autoFocus
          size="large"
        />
      </Modal>
    </div>
  );
}
