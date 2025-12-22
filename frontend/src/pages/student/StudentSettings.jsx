import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  App,
  Card,
  Typography,
  Input,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  Segmented,
  Skeleton,
  Row,
  Col,
  Divider,
  Avatar,
  Badge,
  Tooltip,
  Alert,
  Statistic,
  Grid,
  Tabs,
} from "antd";
import {
  Wand2,
  Palette,
  Volume2,
  User2,
  GraduationCap,
  Users,
  BookOpen,
  Settings,
  Save,
  Edit,
  Info,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

import BackButton from "@/components/student/common/BackButton.jsx";
import BuddyAvatar from "@/components/student/BuddyAvatar.jsx";
import { useStudentApp } from "@/context/StudentAppContext.jsx";
import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";

// Import buddy images
import buddyMilo from "@/assets/buddies/kibundo-buddy.png";
import buddyLumi from "@/assets/buddies/kibundo-buddy1.png";
import buddyZuzu from "@/assets/buddies/monster1.png";
import buddyKiko from "@/assets/buddies/monster21.png";
import buddyPipa from "@/assets/buddies/Hausaufgaben.png";
import buddyNori from "@/assets/buddies/Lernen.png";

const { Title, Text } = Typography;

const BUDDIES = [
  { id: "m1", name: "Milo", img: buddyMilo },
  { id: "m2", name: "Lumi", img: buddyLumi },
  { id: "m3", name: "Zuzu", img: buddyZuzu },
  { id: "m4", name: "Kiko", img: buddyKiko },
  { id: "m5", name: "Pipa", img: buddyPipa },
  { id: "m6", name: "Nori", img: buddyNori },
];

const THEMES = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "sky", label: "Sky" },
];

// Stronger gradient so the header color is clearly visible
const THEME_GRADIENT = {
  indigo: "from-indigo-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  rose: "from-rose-500 to-rose-600",
  amber: "from-amber-500 to-amber-600",
  sky: "from-sky-500 to-sky-600",
};

const THEME_SWATCH = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
};

export default function StudentSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } =
    App.useApp?.() ?? { message: { success: () => {}, error: () => {}, info: () => {} } };

  const { buddy, setBuddy, interests, setInterests, profile, setProfile, setTtsEnabled, setColorTheme } = useStudentApp();
  const auth = useAuthContext?.();
  const { user, account, logout, signOut } = auth || {};
  
  // If parent has selected a child account (Netflix-style), use that child's ID
  // Otherwise, use the logged-in student's ID
  const userId = account?.type === "child" && account?.userId 
    ? account.userId 
    : (user?.id ?? user?._id ?? user?.user_id ?? null);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const avatarSize = screens.lg ? 96 : screens.md ? 80 : 64;

  // local state - declare studentData first so it can be used in defaultName
  const [studentData, setStudentData] = useState(null);

  const defaultName = useMemo(() => {
    // When parent is viewing child, use studentData instead of user (user is parent's data)
    const isParentViewingChild = account?.type === "child" && account?.userId;
    
    // Priority 1: Use studentData (from server) if available - this is the actual student's data
    if (studentData?.user) {
      const studentFirstName = studentData.user.first_name || "";
      const studentLastName = studentData.user.last_name || "";
      const studentFullName = [studentFirstName, studentLastName].filter(Boolean).join(" ").trim();
      if (studentFullName) return studentFullName;
    }
    
    // Priority 2: Only use auth user's name if NOT parent viewing child (to avoid using parent's name)
    if (!isParentViewingChild) {
      const firstName = user?.first_name || "";
      const lastName = user?.last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (fullName) return fullName;
    }
    
    // Priority 3: Use profile name if it's not a test value or page name
    const profileName = profile?.name || "";
    const isTestName = profileName?.toLowerCase().includes("test");
    const isPageName = ["settings", "profile", "appearance", "academic", "interests", "account"].includes(profileName?.toLowerCase());
    if (profileName && !isTestName && !isPageName) return profileName;
    
    // Priority 4: Use user.name only if NOT parent viewing child
    if (!isParentViewingChild && user?.name) {
      const isUserPageName = ["settings", "profile", "appearance", "academic", "interests", "account"].includes(user.name?.toLowerCase());
      if (!isUserPageName) return user.name;
    }
    
    // Priority 5: Use email only if NOT parent viewing child
    if (!isParentViewingChild && user?.email) return user.email.split("@")[0];
    
    return "";
  }, [profile?.name, user, studentData, account?.type, account?.userId]);

  // local state
  const [name, setName] = useState(defaultName);
  const [ttsEnabled, setTTSEnabled] = useState(Boolean(profile?.ttsEnabled));
  const [theme, setTheme] = useState(profile?.theme || "indigo");

  // Sync TTS state when profile changes
  useEffect(() => {
    if (profile?.ttsEnabled !== undefined) {
      setTTSEnabled(Boolean(profile.ttsEnabled));
    }
  }, [profile?.ttsEnabled]);

  // Sync name state when defaultName or studentData changes (if name hasn't been manually edited or is empty)
  useEffect(() => {
    // When parent is viewing child, ALWAYS prioritize studentData to avoid using parent's name
    const isParentViewingChild = account?.type === "child" && account?.userId;
    
    // Priority 1: If we have studentData (from server), use it - this is the actual student's data
    if (studentData?.user) {
      const studentFirstName = studentData.user.first_name || "";
      const studentLastName = studentData.user.last_name || "";
      const studentFullName = [studentFirstName, studentLastName].filter(Boolean).join(" ").trim();
      if (studentFullName && studentFullName !== name) {
        setName(studentFullName);
        return;
      }
    }
    
    // Priority 2: For parent viewing child, NEVER use defaultName (it might contain parent's name)
    if (isParentViewingChild) {
      // If we don't have studentData yet, wait for it rather than using parent's name
      return;
    }
    
    // Priority 3: Only update if name is empty, matches old defaultName, or is a fallback value
    if (!name || name === "Student" || name === defaultName || !defaultName) {
      // Only update if defaultName has a meaningful value
      if (defaultName && defaultName.trim() && defaultName !== "Student") {
        setName(defaultName);
      }
    }
  }, [defaultName, studentData, account?.type, account?.userId, name]);
  const [interestDraft, setInterestDraft] = useState("");
  const [buddyModal, setBuddyModal] = useState(false);
  const [pendingBuddy, setPendingBuddy] = useState(buddy || BUDDIES[0]);
  const [characterModal, setCharacterModal] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hasServerRecord, setHasServerRecord] = useState(false);
  const [serverStudentId, setServerStudentId] = useState(null);
  const [justUpdatedBuddy, setJustUpdatedBuddy] = useState(false);
  const [buddyImageKey, setBuddyImageKey] = useState(0);
  const [hasLocalBuddyChange, setHasLocalBuddyChange] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(0); // Track when last saved

  // Computed student ID - prioritize all available sources for consistency
  const displayStudentId = useMemo(() => {
    // Priority 1: serverStudentId (from API response)
    if (serverStudentId) return serverStudentId;
    // Priority 2: studentData.id (from student record)
    if (studentData?.id) return studentData.id;
    // Priority 3: account.id if it's a child account
    if (account?.type === "child" && account?.id) return account.id;
    // Priority 4: userId as fallback
    if (userId) return userId;
    return "N/A";
  }, [serverStudentId, studentData?.id, account?.type, account?.id, userId]);

  // baseline - tracks the last saved state
  const initialRef = useRef({
    name: defaultName,
    ttsEnabled: Boolean(profile?.ttsEnabled),
    theme,
    buddy,
    interests: interests || [],
  });

  const isDirty = useMemo(() => {
    const a = initialRef.current;
    const currentInterests = interests || [];
    const savedInterests = a.interests || [];
    
    // Compare interests arrays - handle both string and object formats
    const interestsChanged = 
      currentInterests.length !== savedInterests.length ||
      currentInterests.some((interest, idx) => {
        const saved = savedInterests[idx];
        if (typeof interest === 'string' && typeof saved === 'string') {
          return interest !== saved;
        }
        // Compare objects by id and value
        if (typeof interest === 'object' && typeof saved === 'object') {
          return interest?.id !== saved?.id || interest?.value !== saved?.value;
        }
        // Mixed types are different
        return true;
      });
    
    // Compare buddy IDs (handle both object and null cases)
    // Normalize both to null if missing id
    const currentBuddyId = buddy?.id ?? null;
    const savedBuddyId = a.buddy?.id ?? null;
    const buddyChanged = currentBuddyId !== savedBuddyId;
    
    // Compare name (normalize empty strings)
    const nameChanged = (a.name || "") !== (name || "");
    
    // Compare ttsEnabled (ensure boolean comparison)
    const ttsChanged = Boolean(a.ttsEnabled) !== Boolean(ttsEnabled);
    
    // Compare theme (normalize to default)
    const themeChanged = (a.theme || "indigo") !== (theme || "indigo");
    
    const dirty = nameChanged || ttsChanged || themeChanged || buddyChanged || interestsChanged;
    
    
    return dirty;
  }, [name, ttsEnabled, theme, buddy, interests, lastSavedTimestamp]); // Include lastSavedTimestamp to force recalculation

  // Warn on browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Handle browser back button (only if BackButton doesn't handle it)
  // We'll let BackButton handle the warning, so we only need beforeunload for browser refresh/close

  const themePreview = useMemo(() => THEME_GRADIENT[theme] || THEME_GRADIENT.indigo, [theme]);

  // ----- Get character from characterSelection preference -----
  const characterImageMap = {
    1: "/images/img_rectangle_20.png",
    2: "/images/img_rectangle_20_264x174.png",
    3: "/images/img_rectangle_20_1.png",
    4: "/images/img_rectangle_20_2.png",
    5: "/images/img_rectangle_20_3.png",
    6: "/images/img_rectangle_20_4.png",
  };
  
  const CHARACTERS = [
    { id: 1, src: "/images/img_rectangle_20.png", alt: "Character 1 - Boy with striped shirt" },
    { id: 2, src: "/images/img_rectangle_20_264x174.png", alt: "Character 2 - Girl with red hair" },
    { id: 3, src: "/images/img_rectangle_20_1.png", alt: "Character 3 - Boy with blonde hair" },
    { id: 4, src: "/images/img_rectangle_20_2.png", alt: "Character 4 - Girl with dark hair" },
    { id: 5, src: "/images/img_rectangle_20_3.png", alt: "Character 5 - Boy with curly hair" },
    { id: 6, src: "/images/img_rectangle_20_4.png", alt: "Character 6 - Girl with blonde braids" },
  ];
  
  // Get characterSelection from interests
  const characterSelection = useMemo(() => {
    const interestsArray = Array.isArray(interests) ? interests : [];
    const characterPref = interestsArray.find(
      (item) => item?.id === "characterSelection"
    );
    const characterId = characterPref?.value || characterPref?.id;
    return characterId ? characterImageMap[characterId] : null;
  }, [interests]);
  
  // Get current character ID
  const currentCharacterId = useMemo(() => {
    const interestsArray = Array.isArray(interests) ? interests : [];
    const characterPref = interestsArray.find(
      (item) => item?.id === "characterSelection"
    );
    return characterPref?.value || characterPref?.id || null;
  }, [interests]);

  // ----- Live buddy preview -----
  // Ensure we only show actual buddies, not characters
  const displayBuddy = useMemo(() => {
    const currentBuddy = buddyModal ? (pendingBuddy || buddy) : buddy;
    
    // If no buddy, return default Milo
    if (!currentBuddy) {
      return BUDDIES[0]; // Milo (kibundo-buddy)
    }
    
    // Check if buddy has character-like properties (character data mistakenly saved as buddy)
    const isCharacter = 
      currentBuddy.name?.toLowerCase().includes("character") || 
      (typeof currentBuddy.id === "number" && currentBuddy.id >= 1 && currentBuddy.id <= 6) ||
      (typeof currentBuddy.id === "string" && /^[1-6]$/.test(currentBuddy.id)) ||
      currentBuddy.img?.includes("img_rectangle_20") ||
      currentBuddy.avatar?.includes("img_rectangle_20");
    
    // If it's character data, return default Milo instead
    if (isCharacter) {
      return BUDDIES[0]; // Return Milo (kibundo-buddy) as default
    }
    
    // Valid buddy - check if it's a valid buddy ID
    const validBuddyIds = BUDDIES.map(b => b.id);
    if (currentBuddy.id && !validBuddyIds.includes(currentBuddy.id)) {
      // Not a valid buddy ID, return default
      return BUDDIES[0];
    }
    
    return currentBuddy;
  }, [buddyModal, pendingBuddy, buddy]);
  const isPreviewingBuddy = buddyModal && (pendingBuddy?.id !== buddy?.id);

  // ---------- Load settings without 404s ----------
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const sid = (obj) => obj?.id ?? obj?._id ?? obj?.student_id;

    const load = async () => {
      try {
        setLoading(true);

        const allRes = await api.get("/allstudents", {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        
        const match = all.find(
          (s) =>
            s?.user?.id === userId ||
            s?.user_id === userId ||
            sid(s) === userId
        );

        if (!match) {
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          initialRef.current = {
            name: defaultName ?? "",
            ttsEnabled: Boolean(profile?.ttsEnabled),
            theme: profile?.theme || "indigo",
            buddy: buddy ?? null,
            interests: interests || [],
          };
          return;
        }

        const foundId = sid(match);
        const { data, status } = await api.get(`/student/${foundId}`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        if (status === 404 || !data) {
          if (cancelled) return;
          setHasServerRecord(false);
          setServerStudentId(null);
          return;
        }

        if (cancelled) return;

        setHasServerRecord(true);
        setServerStudentId(foundId);

        const srvProfile = data?.profile ?? {};
        const srvInterests = Array.isArray(data?.interests) ? data.interests : [];
        // Only update buddy from server if we haven't just updated it locally
        // This prevents overwriting the newly selected buddy
        const srvBuddy = data?.buddy ?? null;
        
        // Map buddy structure: database uses 'img', context uses 'avatar'
        const mappedBuddy = srvBuddy ? {
          id: srvBuddy.id,
          name: srvBuddy.name,
          avatar: srvBuddy.img || srvBuddy.avatar,
          img: srvBuddy.img || srvBuddy.avatar, // Keep both for compatibility
        } : null;

        // Set student data with explicit id and age fields
        setStudentData({
          ...data,
          id: foundId, // Ensure id is set from the student record
          age: data?.age ?? null, // Include age from student record
        });

        // Set name immediately from student data to avoid showing "Student"
        const apiUser = data?.user ?? {};
        const apiUserName = [apiUser.first_name, apiUser.last_name].filter(Boolean).join(" ").trim();
        if (apiUserName) {
          setName(apiUserName);
        }

        setProfile({
          name: srvProfile.name ?? "",
          ttsEnabled: Boolean(srvProfile.ttsEnabled),
          theme: srvProfile.theme || "indigo",
        });
        setInterests(srvInterests);
        // Always update buddy from server to reflect admin changes
        // BUT: Don't overwrite if student has made local changes (not saved yet)
        if (!hasLocalBuddyChange) {
          if (mappedBuddy) {
            // Ensure the buddy object has all required fields for context
            const buddyForContext = {
              id: mappedBuddy.id,
              name: mappedBuddy.name,
              avatar: mappedBuddy.avatar || mappedBuddy.img,
              img: mappedBuddy.img || mappedBuddy.avatar,
            };
            setBuddy(buddyForContext);
            // Also update pendingBuddy to match
            setPendingBuddy(buddyForContext);
          } else {
            // If no buddy in database, set to null (context will use default)
            setBuddy(null);
            setPendingBuddy(BUDDIES[0]);
          }
          // Reset justUpdatedBuddy flag when loading from database (database is source of truth)
          setJustUpdatedBuddy(false);
          // Force image refresh to show updated buddy
          setBuddyImageKey(prev => prev + 1);
        }

        const serverName = srvProfile.name ?? "";
        // apiUser and apiUserName already declared above, reuse them
        // When parent is viewing child, NEVER use defaultName/fallbackName as it might contain parent's name
        const isParentViewingChild = account?.type === "child" && account?.userId;
        
        // Prioritize user's actual name (first_name + last_name) over profile name
        // Only use profile name if user name is not available and profile name is not a test value or page name
        const isTestName = serverName?.toLowerCase().includes("test");
        const isPageName = ["settings", "profile", "appearance", "academic", "interests", "account"].includes(serverName?.toLowerCase());
        
        // For parent viewing child, only use apiUserName or valid serverName, never fallback to defaultName
        const finalName = apiUserName || (!isTestName && !isPageName && serverName) || (isParentViewingChild ? "" : (defaultName ?? ""));

        // Only set name if we have a valid value (not empty and not parent's name)
        if (finalName && finalName.trim()) {
          setName(finalName);
        }
        const newTtsEnabled = Boolean(srvProfile.ttsEnabled);
        setTTSEnabled(newTtsEnabled);
        setTtsEnabled(newTtsEnabled); // Update context TTS
        const newTheme = srvProfile.theme || "indigo";
        setTheme(newTheme);
        setColorTheme(newTheme); // Update context theme
        
        // pendingBuddy already updated above when setting buddy from database
        // No need to update again here

        initialRef.current = {
          name: srvProfile.name ?? (defaultName ?? ""),
          ttsEnabled: Boolean(srvProfile.ttsEnabled),
          theme: srvProfile.theme || "indigo",
          buddy: srvBuddy,
          interests: srvInterests || [],
        };
      } catch (e) {
        if (!cancelled) {
          message.error?.("Could not load your settings. Using local defaults.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload settings when page becomes visible or periodically (e.g., when admin updates settings)
  useEffect(() => {
    if (!userId || !hasServerRecord) return;
    
    const sid = (obj) => obj?.id ?? obj?._id ?? obj?.student_id;
    
    const loadSettings = async () => {
      try {
        const allRes = await api.get("/allstudents", {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        const all = Array.isArray(allRes?.data) ? allRes.data : [];
        const match = all.find(
          (s) =>
            s?.user?.id === userId ||
            s?.user_id === userId ||
            sid(s) === userId
        );
        if (match) {
          const foundId = sid(match);
          const { data } = await api.get(`/student/${foundId}`, {
            validateStatus: (s) => s >= 200 && s < 500,
          });
          if (data) {
            const srvProfile = data?.profile ?? {};
            const srvInterests = Array.isArray(data?.interests) ? data.interests : [];
            const srvBuddy = data?.buddy ?? null;
            
            // Map buddy structure
            const mappedBuddy = srvBuddy ? {
              id: srvBuddy.id,
              name: srvBuddy.name,
              avatar: srvBuddy.img || srvBuddy.avatar,
              img: srvBuddy.img || srvBuddy.avatar,
            } : null;

            // Update context and local state with server data
            setProfile({
              name: srvProfile.name ?? "",
              ttsEnabled: Boolean(srvProfile.ttsEnabled),
              theme: srvProfile.theme || "indigo",
            });
            setInterests(srvInterests);
            // Always update buddy from database - it's the source of truth
            // BUT: Don't overwrite if student has made local changes (not saved yet)
            if (!hasLocalBuddyChange) {
              if (mappedBuddy) {
                // Ensure the buddy object has all required fields for context
                const buddyForContext = {
                  id: mappedBuddy.id,
                  name: mappedBuddy.name,
                  avatar: mappedBuddy.avatar || mappedBuddy.img,
                  img: mappedBuddy.img || mappedBuddy.avatar,
                };
                setBuddy(buddyForContext);
                // Also update pendingBuddy to match
                setPendingBuddy(buddyForContext);
              } else {
                // If no buddy in database, set to null (context will use default)
                setBuddy(null);
                setPendingBuddy(BUDDIES[0]);
              }
              // Reset justUpdatedBuddy flag when loading from database
              setJustUpdatedBuddy(false);
              // Force image refresh to show updated buddy
              setBuddyImageKey(prev => prev + 1);
            }

            // Update student data with explicit id and age fields
            setStudentData({
              ...data,
              id: foundId, // Ensure id is set from the student record
              age: data?.age ?? null, // Include age from student record
            });
            
            // Update local state - get student name from API data
            const apiUser = data?.user ?? {};
            const apiUserName = [apiUser.first_name, apiUser.last_name].filter(Boolean).join(" ").trim();
            
            // Set name immediately from student data to avoid showing "Student"
            if (apiUserName) {
              setName(apiUserName);
            }
            const serverName = srvProfile.name ?? "";
            
            // When parent is viewing child, NEVER use defaultName as it might contain parent's name
            const isParentViewingChild = account?.type === "child" && account?.userId;
            
            const isTestName = serverName?.toLowerCase().includes("test");
            const isPageName = ["settings", "profile", "appearance", "academic", "interests", "account"].includes(serverName?.toLowerCase());
            
            // For parent viewing child, only use apiUserName or valid serverName, never fallback to defaultName
            const finalName = apiUserName || (!isTestName && !isPageName && serverName) || (isParentViewingChild ? "" : (defaultName || ""));

            // Only set name if we have a valid value (not empty and not parent's name)
            if (finalName && finalName.trim()) {
              setName(finalName);
            }
            setTTSEnabled(Boolean(srvProfile.ttsEnabled));
            setTheme(srvProfile.theme || "indigo");
            setPendingBuddy(srvBuddy || BUDDIES[0]);
            // Set student data with explicit id and age fields
            setStudentData({
              ...data,
              id: foundId, // Ensure id is set from the student record
              age: data?.age ?? null, // Include age from student record
            });

            initialRef.current = {
              name: srvProfile.name ?? (defaultName ?? ""),
              ttsEnabled: Boolean(srvProfile.ttsEnabled),
              theme: srvProfile.theme || "indigo",
              buddy: srvBuddy,
              interests: srvInterests || [],
            };
          }
        }
      } catch (e) {
        // Error reloading settings - silently fail
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && hasServerRecord) {
        // Page became visible, reload settings to get admin updates
        loadSettings();
      }
    };

    const handleFocus = () => {
      // Also reload when window gains focus
      if (hasServerRecord) {
        loadSettings();
      }
    };

    // Set up periodic refresh every 30 seconds (only when page is visible)
    const intervalId = setInterval(() => {
      if (!document.hidden && hasServerRecord) {
        loadSettings();
      }
    }, 30000); // Check every 30 seconds

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, hasServerRecord, justUpdatedBuddy, hasLocalBuddyChange, defaultName, setProfile, setInterests, setBuddy]);

  // ---------- Create on first save ----------
  const createStudentOnServer = async ({ profile, interests, buddy }) => {
    // Ensure buddy has all required fields (id, name, img)
    const buddyToSave = buddy ? {
      id: buddy.id,
      name: buddy.name,
      img: buddy.img || buddy.avatar || BUDDIES.find(b => b.id === buddy.id)?.img || buddyMilo
    } : null;
    
    const payload = {
      userId,
      profile: {
        name: profile?.name ?? "",
        ttsEnabled: Boolean(profile?.ttsEnabled),
        theme: profile?.theme || "indigo",
      },
      interests: Array.isArray(interests) ? interests : [],
      buddy: buddyToSave,
    };
    const res = await api.post(`/addstudent`, payload);
    return res?.data;
  };

  const saveProfileAll = async () => {
    try {
      setSaving(true);
      setProfile({ name, ttsEnabled, theme });

      // Prepare buddy to save with all required fields
      const buddyToSave = buddy ? {
        id: buddy.id,
        name: buddy.name,
        img: buddy.img || buddy.avatar || BUDDIES.find(b => b.id === buddy.id)?.img || buddyMilo
      } : null;

      if (!hasServerRecord) {
        // Create new student record
        const created = await createStudentOnServer({
          profile: { name, ttsEnabled, theme },
          interests: interests || [],
          buddy: buddyToSave,
        });
        setHasServerRecord(true);
        setServerStudentId(created?.id ?? created?._id ?? userId);
        message.success?.("Student created and settings saved!");
      } else {
        // Update existing student record in database
        const payload = {
          profile: {
            name: name ?? "",
            ttsEnabled: Boolean(ttsEnabled),
            theme: theme || "indigo",
          },
          interests: Array.isArray(interests) ? interests : [],
          buddy: buddyToSave,
        };
        
        await api.patch(`/student/${serverStudentId}`, payload);
        message.success?.("Saved successfully");
      }

      // Update initialRef after successful save - this marks the state as "saved"
      // This ensures the unsaved changes warning won't appear after save
      const savedInterests = Array.isArray(interests) ? [...interests] : [];
      
      // Use the exact current values to update initialRef
      // IMPORTANT: Use the current state values, not the saved structure
      // This ensures isDirty will be false after save
      initialRef.current = { 
        name: name || "", // Use current name value from state
        ttsEnabled: Boolean(ttsEnabled), // Use current ttsEnabled from state
        theme: theme || "indigo", // Use current theme from state
        // For buddy, use the current buddy from context (which has the same id as buddyToSave)
        // This ensures the comparison in isDirty will match
        buddy: buddy || null, // Use current buddy from context (has same id as buddyToSave)
        interests: savedInterests // Use current interests from state
      };
      
      
      // Update context to ensure it matches saved state
      setTtsEnabled(ttsEnabled);
      setColorTheme(theme);
      
      // Update studentData to reflect saved state
      if (studentData) {
        setStudentData({ ...studentData, buddy: buddyToSave });
      }
      
      // Reset flags after save - local changes are now saved
      setJustUpdatedBuddy(false);
      setHasLocalBuddyChange(false);
      
      // Update timestamp to force isDirty recalculation
      setLastSavedTimestamp(Date.now());
      
      // Force a small delay to ensure state updates are processed
      // This helps ensure isDirty recalculates with the new initialRef
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      message.error?.("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addInterest = async () => {
    const v = interestDraft.trim();
    if (!v) return;
    
    // Check if interest already exists (handle both string and object formats)
    const interestExists = (interests || []).some(it => {
      if (typeof it === 'string') return it === v;
      return it?.value === v || it?.id === v;
    });
    
    if (interestExists) {
      message.info?.("Already added.");
      return;
    }
    // 🔥 Limit to maximum 2 focus topics
    if ((interests || []).length >= 2) {
      message.warning?.("Du kannst maximal 2 Fokusthemen auswählen. Bitte entferne zuerst ein Thema, bevor du ein neues hinzufügst.");
      return;
    }
    
    // Add as simple string for manual interests (not from onboarding)
    const newInterests = [...(interests || []), v];
    setInterests(newInterests);
    setInterestDraft("");
    
    // Auto-save interests to database
    if (hasServerRecord && serverStudentId) {
      try {
        const payload = {
          profile: { name: name ?? "", ttsEnabled: Boolean(ttsEnabled), theme: theme || "indigo" },
          interests: newInterests,
          buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
        };
        
        await api.patch(`/student/${serverStudentId}`, payload);
        message.success?.(`Interest "${v}" saved!`);
      } catch (error) {
        message.error?.("Could not save interest. Please try again.");
      }
    } else {
      message.warning?.(`Interest "${v}" added locally. Click Save Settings to persist.`);
    }
  };

  const removeInterest = async (val) => {
    // Handle both string and object formats when filtering
    const newInterests = (interests || []).filter((x) => {
      if (typeof val === 'string') {
        // If val is a string, compare with string interests or object values
        return typeof x === 'string' ? x !== val : (x?.value !== val && x?.id !== val);
      } else {
        // If val is an object, compare by id or value
        const valId = val?.id;
        const valValue = val?.value;
        if (typeof x === 'string') {
          return x !== valValue && x !== valId;
        }
        return x?.id !== valId && x?.value !== valValue;
      }
    });
    setInterests(newInterests);
    
    // Get display value for message
    const displayVal = typeof val === 'string' ? val : (val?.value || val?.id || 'interest');
    
    // Auto-save interests to database
    if (hasServerRecord && serverStudentId) {
      try {
        const payload = {
          profile: { name: name ?? "", ttsEnabled: Boolean(ttsEnabled), theme: theme || "indigo" },
          interests: newInterests,
          buddy: buddy ? { id: buddy.id, name: buddy.name, img: buddy.img } : null,
        };
        
        await api.patch(`/student/${serverStudentId}`, payload);
        message.success?.(`Interest "${displayVal}" removed!`);
      } catch (error) {
        message.error?.("Could not remove interest. Please try again.");
      }
    } else {
      message.warning?.(`Interest "${displayVal}" removed locally. Click Save Settings to persist.`);
    }
  };

  const confirmBuddy = () => {
    // Just update local state - don't save to database yet
    // Save will happen when user clicks "Save Changes" button
    const buddyToUpdate = pendingBuddy ? {
      id: pendingBuddy.id,
      name: pendingBuddy.name,
      avatar: pendingBuddy.img || pendingBuddy.avatar || BUDDIES.find(b => b.id === pendingBuddy.id)?.img || buddyMilo,
      img: pendingBuddy.img || pendingBuddy.avatar || BUDDIES.find(b => b.id === pendingBuddy.id)?.img || buddyMilo,
    } : null;
    
    // Update buddy in context and local state (preview only, not saved yet)
    setBuddy(buddyToUpdate);
    // Force image re-render by updating the key
    setBuddyImageKey(prev => prev + 1);
    
    // Mark that student has made a local change (don't overwrite with database sync)
    setHasLocalBuddyChange(true);
    setJustUpdatedBuddy(true);
    
    // Close the modal
    setBuddyModal(false);
  };

  const confirmCharacter = () => {
    if (!pendingCharacter) return;
    
    // Update characterSelection in interests
    const interestsArray = Array.isArray(interests) ? interests : [];
    const updatedInterests = interestsArray.filter(
      (item) => item?.id !== "characterSelection"
    );
    
    // Add new characterSelection preference
    updatedInterests.push({
      id: "characterSelection",
      value: pendingCharacter.id,
      prompt: "Wähle Deine Figur aus die dich begleitet." // Default prompt
    });
    
    // Update interests in context
    setInterests(updatedInterests);
    
    // Force image re-render by updating the key
    setBuddyImageKey(prev => prev + 1);
    
    // Close the modal
    setCharacterModal(false);
  };

  const handleSwitchProfile = () => {
    navigate("/parent/account", { replace: true });
  };

  const ThemeOption = ({ value, label }) => (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded-full ${THEME_SWATCH[value]}`} />
      <span>{label}</span>
    </div>
  );

  return (
    <div
      className={`
        relative bg-gradient-to-br from-gray-50 to-gray-100
        min-h-[100svh] lg:h-full overflow-y-auto 
        px-3 sm:px-4 md:px-6 py-4 pb-24
      `}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton 
            className="p-2 rounded-full hover:bg-neutral-100 active:scale-95" 
            aria-label="Back"
            onBeforeNavigate={() => {
              // Force recalculation of isDirty by reading initialRef directly
              const a = initialRef.current;
              const currentInterests = interests || [];
              const savedInterests = a.interests || [];
              // Compare interests arrays - handle both string and object formats
              const interestsChanged = 
                currentInterests.length !== savedInterests.length ||
                currentInterests.some((interest, idx) => {
                  const saved = savedInterests[idx];
                  if (typeof interest === 'string' && typeof saved === 'string') {
                    return interest !== saved;
                  }
                  // Compare objects by id and value
                  if (typeof interest === 'object' && typeof saved === 'object') {
                    return interest?.id !== saved?.id || interest?.value !== saved?.value;
                  }
                  // Mixed types are different
                  return true;
                });
              const currentBuddyId = buddy?.id ?? null;
              const savedBuddyId = a.buddy?.id ?? null;
              const buddyChanged = currentBuddyId !== savedBuddyId;
              const nameChanged = (a.name || "") !== (name || "");
              const ttsChanged = Boolean(a.ttsEnabled) !== Boolean(ttsEnabled);
              const themeChanged = (a.theme || "indigo") !== (theme || "indigo");
              const actuallyDirty = nameChanged || ttsChanged || themeChanged || buddyChanged || interestsChanged;
              
              if (actuallyDirty) {
                return new Promise((resolve) => {
                  Modal.confirm({
                    title: "Unsaved Changes",
                    content: "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
                    okText: "Leave",
                    cancelText: "Stay",
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                  });
                });
              }
              return true;
            }}
          />
          <div className="min-w-0">
            <Title level={3} className="!mb-0 flex items-center gap-2 !text-[clamp(1.15rem,2vw,1.5rem)]">
              <Settings className="h-5 w-5 shrink-0" />
              <span className="truncate">Settings</span>
            </Title>
            <Text type="secondary" className="block truncate">Manage your profile and preferences</Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Save className="h-4 w-4" />}
          onClick={saveProfileAll}
          loading={saving}
          disabled={saving || (!isDirty && hasServerRecord)}
          className="rounded-xl w-full sm:w-auto"
        >
          Save Changes
        </Button>
      </div>

      {/* Main Tabs */}
      <Card className="rounded-2xl shadow-lg border-0">
        <Tabs
          defaultActiveKey="profile"
          size="large"
          items={[
            {
              key: "profile",
              label: (
                <span className="flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  Profile
                </span>
              ),
              children: (
                <div className="py-4">
                  {/* Profile Overview */}
                  <div className={`p-6 bg-gradient-to-br ${themePreview} rounded-2xl text-white mb-6`}>
                    <Row align="middle" gutter={[16, 16]}>
                      <Col xs={24} sm="auto">
                        <div className="flex flex-col items-center gap-2">
                          <Badge dot={isDirty} color="#52c41a">
                            <img
                              key={`profile-character-${characterSelection || "default"}-${buddyImageKey}`}
                              src={characterSelection || displayBuddy?.img || buddyMilo}
                              alt="Profile Character"
                              width={avatarSize}
                              height={avatarSize}
                              className="border-4 border-white shadow-lg object-contain rounded-2xl"
                              onError={(e) => {
                                e.target.src = buddyMilo;
                              }}
                            />
                          </Badge>
                          <Button
                            type="default"
                            size="small"
                            icon={<Edit className="h-3 w-3" />}
                            onClick={() => {
                              // Set pending character to current character when opening modal
                              const currentChar = CHARACTERS.find(c => c.id === currentCharacterId) || CHARACTERS[0];
                              setPendingCharacter(currentChar);
                              setCharacterModal(true);
                            }}
                            className="rounded-lg text-xs"
                          >
                            Change Character
                          </Button>
                        </div>
                      </Col>
                      <Col flex="auto">
                        <Title level={2} className="!mb-2 !text-white">
                          {(() => {
                            // Priority 1: Use name state if valid
                            if (name && name.trim() && name !== "Settings" && name !== "Profile" && name !== "Student") {
                              return name;
                            }
                            // Priority 2: Use studentData directly if available (most reliable)
                            if (studentData?.user) {
                              const studentFirstName = studentData.user.first_name || "";
                              const studentLastName = studentData.user.last_name || "";
                              const studentFullName = [studentFirstName, studentLastName].filter(Boolean).join(" ").trim();
                              if (studentFullName) return studentFullName;
                            }
                            // Priority 3: Use defaultName if valid
                            if (defaultName && defaultName.trim() && defaultName !== "Settings" && defaultName !== "Profile" && defaultName !== "Student") {
                              return defaultName;
                            }
                            // Fallback
                            return "Student";
                          })()}
                        </Title>
                        <Text className="text-white/90 text-lg">
                          Student ID: {displayStudentId}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  {/* Profile Form */}
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : (
                    <div className="space-y-6">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Text strong className="text-base">Display Name</Text>
                            <Tooltip title="Contact your teacher or admin to change your name">
                              <Input
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl"
                                size="large"
                                disabled
                                prefix={<User2 className="h-4 w-4 text-gray-400" />}
                              />
                            </Tooltip>
                          </div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Text strong className="text-base">Grade</Text>
                            <Input 
                              value={studentData?.class?.class_name || studentData?.class_name || "N/A"} 
                              disabled 
                              className="rounded-xl" 
                              size="large"
                            />
                          </div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Text strong className="text-base">Age</Text>
                            <Input 
                              value={studentData?.age !== undefined && studentData?.age !== null ? String(studentData.age) : "N/A"} 
                              disabled 
                              className="rounded-xl" 
                              size="large"
                            />
                          </div>
                        </Col>
                      </Row>

                      <Divider />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <Text strong className="flex items-center gap-2 text-base">
                              <Volume2 className="h-5 w-5" />
                              Text-to-Speech
                            </Text>
                            <Text type="secondary" className="block mt-1">
                              Enable voice feedback from your buddy
                            </Text>
                          </div>
                          <Switch 
                            checked={ttsEnabled} 
                            onChange={(checked) => {
                              // Update local state only - don't save to database yet
                              // Save will happen when user clicks "Save Changes" button
                              setTTSEnabled(checked);
                              setTtsEnabled(checked);
                              setProfile({ ...profile, ttsEnabled: checked });
                            }} 
                            size="large" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "appearance",
              label: (
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Appearance
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <Title level={4} className="!mb-4">Color Theme</Title>
                    <Segmented
                      block
                      value={theme}
                      onChange={(val) => {
                        // Update local state only - don't save to database yet
                        // Save will happen when user clicks "Save Changes" button
                        setTheme(val);
                        setColorTheme(val);
                        setProfile({ ...profile, theme: val });
                      }}
                      options={THEMES.map((t) => ({
                        label: <ThemeOption value={t.value} label={t.label} />,
                        value: t.value,
                      }))}
                      className="!rounded-xl"
                      size="large"
                    />
                    <Alert
                      message="Theme Preview"
                      description="Your selected theme will be applied across the entire application."
                      type="info"
                      icon={<Info className="h-4 w-4" />}
                      showIcon
                      className="rounded-xl mt-4"
                    />
                  </div>

                  <Divider />

                  {/* Learning Buddy */}
                  <div>
                    <Title level={4} className="!mb-4 flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      Learning Buddy
                    </Title>
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4 flex-wrap">
                        <img
                          key={`buddy-appearance-${displayBuddy?.id || "default"}-${buddyImageKey}`}
                          src={displayBuddy?.img || buddyMilo}
                          alt={displayBuddy?.name || "Learning Buddy"}
                          width={80}
                          height={80}
                          className="border-2 border-gray-200 object-contain rounded-xl"
                          onError={(e) => {
                            e.target.src = buddyMilo;
                          }}
                        />
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2 mb-1">
                            <Title level={5} className="!mb-0">
                              {displayBuddy?.name || "No buddy selected"}
                            </Title>
                            {isPreviewingBuddy && (
                              <Tag color="blue">Preview</Tag>
                            )}
                          </div>
                          <Text type="secondary" className="block mb-3">
                            Pick a friend to guide you through your learning journey
                          </Text>
                          <Button 
                            type="primary" 
                            className="rounded-xl" 
                            onClick={() => {
                              // Set pending buddy to current buddy when opening modal
                              setPendingBuddy(buddy || BUDDIES[0]);
                              setBuddyModal(true);
                            }} 
                            icon={<Edit className="h-4 w-4" />}
                          >
                            Change Buddy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "academic",
              label: (
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                  ) : (
                    <>
                      {/* Quick Stats */}
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-blue-100 bg-blue-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Class</Text>}
                              value={studentData?.class?.class_name || studentData?.class_name || "N/A"}
                              prefix={<GraduationCap className="h-5 w-5 text-blue-600" />}
                              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#1890ff" }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-green-100 bg-green-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Subjects</Text>}
                              value={studentData?.subject?.length || 0}
                              prefix={<BookOpen className="h-5 w-5 text-green-600" />}
                              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#52c41a" }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Card className="text-center rounded-xl border-2 border-purple-100 bg-purple-50">
                            <Statistic
                              title={<Text strong className="text-gray-700">Parent</Text>}
                              value={
                                studentData?.parent?.user
                                  ? [studentData.parent.user.first_name, studentData.parent.user.last_name]
                                      .filter(Boolean)
                                      .join(" ") || "Linked"
                                  : "N/A"
                              }
                              prefix={<Users className="h-5 w-5 text-purple-600" />}
                              valueStyle={{ fontSize: 16, fontWeight: 700, color: "#722ed1" }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Divider />

                      {/* Enrolled Subjects */}
                      <div>
                        <Title level={4} className="!mb-4">Enrolled Subjects</Title>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const subjects = studentData?.subject || studentData?.subjects || [];
                            
                            if (!Array.isArray(subjects) || subjects.length === 0) {
                              return (
                                <Tag color="default" className="text-sm px-4 py-2 rounded-xl">
                                  No subjects enrolled
                                </Tag>
                              );
                            }
                            
                            return subjects.map((s, index) => {
                              const subjectName = 
                                s?.subject?.subject_name ||
                                s?.subject?.name || 
                                s?.Subject?.subject_name ||
                                s?.Subject?.name ||
                                s?.subject_name ||
                                s?.name ||
                                (typeof s === 'string' ? s : null);
                              
                              if (!subjectName) return null;
                              
                              return (
                                <Tag key={s?.id || index} color="green" className="text-base px-4 py-2 rounded-xl">
                                  {subjectName}
                                </Tag>
                              );
                            }).filter(Boolean);
                          })()}
                        </div>
                      </div>

                      {/* Parent/Guardian Info */}
                      <div>
                        <Title level={4} className="!mb-4">Parent/Guardian</Title>
                        <Card className="rounded-xl bg-gray-50">
                          <Text className="text-gray-700 text-base">
                            {studentData?.parent?.user
                              ? [studentData.parent.user.first_name, studentData.parent.user.last_name].filter(Boolean).join(" ") ||
                                studentData.parent.user.email ||
                                "N/A"
                              : "No parent/guardian linked"}
                          </Text>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: "interests",
              label: (
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Interests
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <Title level={4} className="!mb-0">
                      {name || defaultName ? `${name || defaultName}'s Interests` : "My Interests"}
                    </Title>
                    <Button 
                      type="primary" 
                      className="rounded-xl" 
                      onClick={() => navigate("/student/onboarding/buddy")}
                    >
                      Run Interests Wizard
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-2xl min-h-[100px]">
                    {(interests || []).length === 0 ? (
                      <Text type="secondary" className="text-base">
                        {name || defaultName 
                          ? `${name || defaultName} hasn't added any interests yet — add some below to personalize your learning experience`
                          : "No interests yet — add some below to personalize your learning experience"}
                      </Text>
                    ) : (
                      (interests || []).map((it, idx) => {
                        // Handle both old format (string) and new format (object with id, value, prompt)
                        const interestValue = typeof it === 'string' ? it : (it?.value || it?.id || String(it));
                        const interestKey = typeof it === 'string' ? it : (it?.id || `interest-${idx}`);
                        return (
                          <Tag
                            key={interestKey}
                            closable
                            onClose={(e) => {
                              e.preventDefault();
                              removeInterest(it);
                            }}
                            className="rounded-full px-4 py-2 text-base"
                            color="blue"
                          >
                            {interestValue}
                          </Tag>
                        );
                      })
                    )}
                  </div>

                  <div>
                    <Text strong className="block mb-2 text-base">Add New Interest</Text>
                    <Space.Compact className="w-full" size="large">
                      <Input
                        value={interestDraft}
                        onChange={(e) => setInterestDraft(e.target.value)}
                        placeholder="E.g., Dinosaurs, Space, Art..."
                        className="rounded-l-xl"
                        onPressEnter={addInterest}
                      />
                      <Button type="primary" onClick={addInterest} className="rounded-r-xl">
                        Add
                      </Button>
                    </Space.Compact>
                  </div>
                </div>
              ),
            },
            {
              key: "account",
              label: (
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Account
                </span>
              ),
              children: (
                <div className="py-4 space-y-6">
                  <Alert
                    message="Account Settings"
                    description="Switch between profiles or manage your account preferences"
                    type="info"
                    showIcon
                    className="rounded-xl"
                  />

                  <Card className="rounded-xl bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <Title level={5} className="!mb-1 !text-blue-700">Switch Profile</Title>
                        <Text type="secondary">Choose a different profile to continue</Text>
                      </div>
                      <Button 
                        icon={<Users className="h-4 w-4" />} 
                        type="primary"
                        onClick={handleSwitchProfile} 
                        className="rounded-xl"
                        size="large"
                      >
                        Switch Profile
                      </Button>
                    </div>
                  </Card>

                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Sticky mobile save bar */}
      {isDirty && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur px-4 py-3 z-40">
          <Button
            type="primary"
            icon={<Save className="h-4 w-4" />}
            className="w-full rounded-xl"
            onClick={saveProfileAll}
            loading={saving}
            disabled={saving || (!isDirty && hasServerRecord)}
            aria-live="polite"
          >
            Save Changes
          </Button>
        </div>
      )}

      {/* Buddy modal with live preview */}
      <Modal
        open={buddyModal}
        onCancel={() => {
          setBuddyModal(false);
          // Reset pending buddy to current buddy when canceling
          setPendingBuddy(buddy || BUDDIES[0]);
        }}
        onOk={confirmBuddy}
        okText="Choose"
        className="rounded-2xl"
        width={isMobile ? 360 : 520}
      >
        <Title level={5} className="!mb-3">
          Choose a Buddy
        </Title>

        {/* Live preview in modal */}
        <div className="mb-4 flex items-center gap-3">
          <Avatar 
            key={`buddy-modal-${(pendingBuddy || buddy)?.id || "default"}-${buddyImageKey}`}
            size={72} 
            src={(pendingBuddy || buddy)?.img || buddyMilo} 
          />
          <div>
            <div className="font-semibold text-base">
              {(pendingBuddy || buddy)?.name || "Select a buddy"}
            </div>
            <Text type="secondary" className="text-xs">
              This is how your buddy will look before you apply it.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {BUDDIES.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setPendingBuddy(b);
                // Force preview update
                setBuddyImageKey(prev => prev + 1);
              }}
              className={`text-left rounded-xl border-2 p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-300 ${
                pendingBuddy?.id === b.id ? "border-blue-500" : "border-transparent hover:border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <BuddyAvatar src={b.img} size={56} />
                <div className="font-semibold">{b.name}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Character modal with live preview */}
      <Modal
        open={characterModal}
        onCancel={() => {
          setCharacterModal(false);
          // Reset pending character to current character when canceling
          const currentChar = CHARACTERS.find(c => c.id === currentCharacterId) || CHARACTERS[0];
          setPendingCharacter(currentChar);
        }}
        onOk={confirmCharacter}
        okText="Choose"
        className="rounded-2xl"
        width={isMobile ? 360 : 520}
      >
        <Title level={5} className="!mb-3">
          Choose Your Character
        </Title>

        {/* Live preview in modal */}
        <div className="mb-4 flex items-center gap-3">
          <Avatar 
            key={`character-modal-${(pendingCharacter || CHARACTERS.find(c => c.id === currentCharacterId))?.id || "default"}-${buddyImageKey}`}
            size={72} 
            src={(pendingCharacter || CHARACTERS.find(c => c.id === currentCharacterId))?.src || CHARACTERS[0].src} 
          />
          <div>
            <div className="font-semibold text-base">
              Character {(pendingCharacter || CHARACTERS.find(c => c.id === currentCharacterId))?.id || 1}
            </div>
            <Text type="secondary" className="text-xs">
              This is how your character will look on your account.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CHARACTERS.map((char) => (
            <button
              key={char.id}
              onClick={() => {
                setPendingCharacter(char);
                // Force preview update
                setBuddyImageKey(prev => prev + 1);
              }}
              className={`text-left rounded-xl border-2 p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-300 ${
                pendingCharacter?.id === char.id ? "border-blue-500" : "border-transparent hover:border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={char.src}
                  alt={char.alt}
                  className="w-14 h-14 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.src = CHARACTERS[0].src;
                  }}
                />
                <div className="font-semibold">Character {char.id}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
