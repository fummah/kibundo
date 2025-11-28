// src/hooks/useStudentFirstName.js
import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import api from "@/api/axios";

/**
 * Hook to get the student's first name
 * Handles both direct student login and parent viewing child account
 */
export function useStudentFirstName() {
  const { user, account } = useAuthContext();
  const [firstName, setFirstName] = useState("");
  const nameFetchedRef = useRef(false);

  useEffect(() => {
    const fetchStudentName = async () => {
      // Prevent multiple fetches
      if (nameFetchedRef.current) return;
      nameFetchedRef.current = true;

      try {
        // Priority 1: If parent viewing child, get name from account
        if (account?.type === "child" && account?.raw?.user?.first_name) {
          setFirstName(account.raw.user.first_name);
          return;
        }

        // Priority 2: If we have user's first name directly, use it
        if (user?.first_name) {
          setFirstName(user.first_name);
          return;
        }

        // Priority 3: Fetch from API
        const studentId = account?.type === "child" && account?.userId 
          ? account.userId 
          : (user?.id || user?.user_id || null);

        if (studentId) {
          const studentsRes = await api.get("/allstudents");
          const students = Array.isArray(studentsRes.data)
            ? studentsRes.data
            : studentsRes.data?.data || [];
          
          const student = students.find(
            (s) => s?.user?.id === studentId || s?.user_id === studentId || s?.id === studentId
          );
          
          if (student?.user?.first_name) {
            setFirstName(student.user.first_name);
          }
        }
      } catch (err) {
        console.debug("Could not fetch student name:", err);
      }
    };

    fetchStudentName();
  }, [account, user]);

  return firstName;
}

