// src/pages/parent/myfamily/MyFamily.jsx
import React from "react";
import { useSearchParams } from "react-router-dom";
import { Navigate } from "react-router-dom";

export default function MyFamily() {
  const [searchParams] = useSearchParams();
  const addStudent = searchParams.get("add-student") || searchParams.get("add");

  // If add-student query param is present, redirect to add student intro
  if (addStudent === "1") {
    return <Navigate to="/parent/myfamily/add-student-intro" replace />;
  }

  // Otherwise, redirect to home (or show family list in the future)
  return <Navigate to="/parent/home" replace />;
}
