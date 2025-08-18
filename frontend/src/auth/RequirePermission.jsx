// src/auth/RequirePermission.jsx
import React from "react";
import { Result } from "antd";
import { useCurrentUser } from "../state/useCurrentUser"; // your existing hook
import { can } from "./permissions";

export function RequirePermission({ perm, children }) {
  const user = useCurrentUser();
  if (!can(user, perm)) {
    return <Result status="403" title="No access" subTitle="You lack permissions to view this." />;
  }
  return <>{children}</>;
}
