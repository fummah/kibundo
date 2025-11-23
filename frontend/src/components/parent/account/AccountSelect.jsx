// C:\wamp64\www\kibundo\frontend\src\components\parent\account\AccountSelect.jsx

import { useEffect, useMemo, useState } from "react";
import { LeftOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";
import { ROLE_PATHS, ROLES } from "@/utils/roleMapper";
import buddyA from "@/assets/buddies/monster1.png";
import buddyB from "@/assets/buddies/monster2.png";
import PlainBackground from "@/components/layouts/PlainBackground";

const fallbackBuddies = [buddyA, buddyB];

function formatName(user = {}) {
  const first = user.first_name || user.given_name || "";
  const last = user.last_name || user.family_name || "";
  const full = `${first} ${last}`.trim();
  return full || user.name || "Unbenannt";
}

export default function AccountSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccount, user } = useAuthContext();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              
              // Priority order for avatar:
              // 1. User's avatar (selected during onboarding in CreateProfile)
              // 2. Selected buddy image (from onboarding buddy selection)
              // 3. Default buddy images
              const userAvatar = studentUser.avatar || null;
              const buddyImg = student.buddy?.img || student.buddy?.avatar || null;
              
              // Use user avatar first (from CreateProfile onboarding), then buddy, then default
              const avatar = userAvatar || buddyImg || fallbackBuddies[index % fallbackBuddies.length];
              
              
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
    if (typeof setAccount === "function") {
      setAccount(account);
    }

    if (account.type === "parent") {
      navigate(parentDestination, { replace: true });
      return;
    }

    // Netflix-style: When child is clicked, navigate directly to their dashboard
    // The StudentAccessGate will allow parent access when account is set
    navigate("/student/home", { replace: true });
  };

  return (
    <PlainBackground>
      <div className="relative z-10 w-full max-w-[620px] px-6 pb-20 pt-16">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F0E4D8] bg-white text-[#4F3A2D] shadow-[0_8px_16px_rgba(79,58,45,0.12)]"
        >
          <LeftOutlined />
        </button>

        <h1 className="mt-6 text-center text-3xl font-semibold text-[#4F3A2D]">
          Account
        </h1>

        <p className="mt-6 text-lg font-semibold text-[#816B5B]">
          Wer bist Du?
        </p>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-white/85 p-6 text-center text-sm text-[#9A8576] shadow">
            {error}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {accounts.map((account) => (
              <button
                key={`${account.type}-${account.id}`}
                type="button"
                onClick={() => handleSelect(account)}
                className="flex w-full items-center gap-4 rounded-[28px] bg-white/95 px-5 py-4 text-left shadow-[0_12px_28px_rgba(79,58,45,0.12)] transition hover:bg-white"
              >
                <img
                  src={account.avatar || fallbackBuddies[0]}
                  alt={account.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <span className="text-lg font-semibold text-[#4F3A2D]">
                  {account.name}
                </span>
              </button>
            ))}

            {accounts.length === 0 && (
              <div className="mt-6 rounded-[28px] bg-white/85 p-6 text-center text-sm text-[#9A8576] shadow">
                Noch keine Konten gefunden. Lege zuerst ein Kinderkonto an.
              </div>
            )}
          </div>
        )}
      </div>
    </PlainBackground>
  );
}
