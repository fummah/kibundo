// src/pages/admin/RolesLocal.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Tag,
  Space,
  Button,
  Switch,
  Segmented,
  Tabs,
  Table,
  Dropdown,
  Empty,
  Input,
  Select,
  Form,
  Drawer,
  Divider,
  Typography,
  Modal,
  message,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  EditOutlined,
  MailOutlined,
  UserAddOutlined,
  StopOutlined,
  PoweroffOutlined,
  KeyOutlined,
  LockOutlined,
  DeleteOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "@/api/axios";

const { Title, Text } = Typography;

/* ======================= CONFIG ======================= */
// Toggle user creation via API (keep true for DB mode) — reserved flag
const USE_API_CREATE_USER = true;

/* ----------------------------- constants ----------------------------- */
const ALL_PERMS = [
  "blog:*",
  "quiz:*",
  "academics:*",
  "support:tickets:*",
  "users:read",
  "users:write:suspend",
  "billing:read",
  "billing:write",
  "newsletter:*",
  "agent:*", // Kibundo Agent (locked to Admin)
];

// Role endpoints (primary + graceful fallbacks)
const ROLE_API = {
  list: "/allroles",
  create: ["/roles", "/addrole"],
  update: (id) => [`/roles/${id}`, `/updaterole/${id}`],
  delete: (id) => [`/roles/${id}`, `/deleterole/${id}`],
};

/* ----------------------------- security helpers ---------------------------- */
const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};
const isAdminUser = () => {
  const u = getCurrentUser();
  const name = (u?.role_name || u?.role || "").toLowerCase();
  return u?.role_id === 1 || name === "admin";
};

/* -------------------------------- utils ------------------------------- */
const getRoleNameById = (roles, role_id) =>
  roles.find((r) => String(r.id) === String(role_id))?.name || "";

// Normalize permissions: accept array, JSON string, or comma string
const toPermArray = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
    return s.split(",").map((p) => p.trim()).filter(Boolean);
  }
  return [];
};

/* -------------------------------- component ------------------------------- */
export default function RolesLocal() {
  const { t, i18n } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // Log once per language change (avoid spam from re-renders)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("Translation hook ready:", { lang: i18n.language });
    // eslint-disable-next-line no-console
    console.log("i18n test:", t("rolesList.accessControl.title", "Access Control"));
  }, [i18n.language, t]);

  /* ------------------------------- state ------------------------------ */
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [openRole, setOpenRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm] = Form.useForm();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [openUser, setOpenUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  // Users list UI state
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  const [activeFilter, setActiveFilter] = useState(); // true | false | undefined

  /* -------------------------- derived data & utils ------------------------- */
  const isAdmin = isAdminUser();

  const roleSelectOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles]
  );

  const getRoleById = useCallback((id) => roles.find((r) => String(r.id) === String(id)), [roles]);
  const getRolePermsById = useCallback(
    (id) => {
      const perms = getRoleById(id)?.permissions;
      return Array.isArray(perms) ? perms : [];
    },
    [getRoleById]
  );

  const permOptions = useMemo(
    () =>
      ALL_PERMS.map((p) => {
        const locked = p.startsWith("agent:");
        return {
          value: p,
          label: locked ? (
            <span>
              <LockOutlined style={{ marginRight: 6 }} />
              {p} {isAdmin ? "" : "(admin only)"}
            </span>
          ) : (
            p
          ),
          disabled: locked && !isAdmin,
        };
      }),
    [isAdmin]
  );

  /* ------------------------------ data fetchers ------------------------------ */
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const { data } = await api.get(ROLE_API.list);
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        id: r.id,
        name: r.name || r.role_name || r.title || String(r.id),
        permissions: toPermArray(r.permissions),
      }));
      normalized.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      setRoles(normalized);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchRoles error:", err);
      messageApi.error(t("rolesList.toasts.rolesFetchFail", "Failed to load roles from the database."));
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/users");
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map((u) => ({
        id: u.id,
        role_id: u.role_id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        status: u.status || "Pending",
        contact_number: u.contact_number || null,
        isActive: typeof u.isActive === "boolean" ? u.isActive : true,
        created_at: u.created_at || u.createdAt || null,
        permissions: getRolePermsById(u.role_id),
        inheritPerms: true,
      }));
      normalized.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      setUsers(normalized);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchUsers error:", err);
      messageApi.error(t("rolesList.toasts.usersFetchFail", "Failed to load users from the database."));
    } finally {
      setUsersLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchRoles(), fetchUsers()]);
  };

  /* --------------------------------- init --------------------------------- */
  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------- role CRUD ------------------------------- */
  const openCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    roleForm.setFieldsValue({ name: "", permissions: ["users:read"] });
    setOpenRole(true);
  };

  const openEditRole = (row) => {
    setEditingRole(row);
    roleForm.resetFields();
    roleForm.setFieldsValue({
      name: row.name,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    });
    setOpenRole(true);
  };

  const trySeveral = async (methods) => {
    let lastErr;
    for (const fn of methods) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fn();
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  const submitRole = async () => {
    const vals = await roleForm.validateFields();
    const name = String(vals.name || "").trim();
    const permissions = Array.isArray(vals.permissions) ? vals.permissions : [];

    if (!name) return messageApi.error(t("rolesList.role.name.required", "Role name is required"));
    if (!isAdmin && permissions.some((p) => p.startsWith("agent:"))) {
      return messageApi.warning(t("rolesList.role.permissions.adminOnlyWarn", "Only Admin can edit Kibundo Agent permissions."));
    }

    // Support both new and legacy backends (some expect name, some role_name; some expect array, some CSV)
    const payload = {
      name,
      role_name: name,
      permissions, // preferred: array/JSON
      permissions_csv: permissions.join(","), // fallback for CSV-based APIs
    };

    try {
      if (editingRole) {
        await trySeveral(ROLE_API.update(editingRole.id).map((url) => () => api.put(url, payload)));
        messageApi.success(t("rolesList.toasts.roleUpdated", "Role updated."));
      } else {
        await trySeveral(ROLE_API.create.map((url) => () => api.post(url, payload)));
        messageApi.success(t("rolesList.toasts.roleCreated", "Role created."));
      }
      setOpenRole(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("role submit error:", err);
      if (err?.response?.status === 404) {
        messageApi.error(t("rolesList.toasts.roleEndpointMissing", "Your API does not expose create/update role endpoints yet. Only listing is available."));
      } else {
        messageApi.error(t("rolesList.toasts.roleSaveFailed", "Failed to save role."));
      }
    }
  };

  const deleteRole = (row) => {
    Modal.confirm({
      title: t("rolesList.role.deleteConfirm", "Delete role \"{{name}}\"?", { name: row.name }),
      okText: t("common.delete", "Delete"),
      okType: "danger",
      cancelText: t("common.cancel", "Cancel"),
      onOk: async () => {
        try {
          await trySeveral(ROLE_API.delete(row.id).map((url) => () => api.delete(url)));
          messageApi.success(t("rolesList.toasts.roleDeleted", "Role deleted."));
          fetchRoles();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("delete role error:", err);
          if (err?.response?.status === 404) {
            messageApi.error(t("rolesList.toasts.roleDeleteMissing", "Your API does not expose delete role endpoint."));
          } else {
            messageApi.error(t("rolesList.toasts.roleDeleteFailed", "Failed to delete role."));
          }
        }
      },
    });
  };

  /* ------------------------------ users CRUD ------------------------------- */
  const openCreateUser = () => {
    const defaultRoleId = roles.find((r) => r.name === "Parent")?.id || roles[0]?.id;
    const defaultPerms = defaultRoleId ? getRolePermsById(defaultRoleId) : [];
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      contact_number: "",
      role_id: defaultRoleId,
      status: "Pending",
      isActive: true,
      inheritPerms: true,
      permissions: defaultPerms,
      password: "",
      confirm_password: "",
      state: "",
    });
    setOpenUser(true);
  };

  const openEditUser = useCallback(
    (row) => {
      setEditingUser(row);
      userForm.resetFields();
      userForm.setFieldsValue({
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: row.email,
        contact_number: row.contact_number || "",
        role_id: row.role_id,
        status: row.status || "Pending",
        isActive: row.isActive ?? true,
        inheritPerms: !!row.inheritPerms,
        permissions: Array.isArray(row.permissions) ? row.permissions : getRolePermsById(row.role_id),
        password: "",
        confirm_password: "",
        state: "",
      });
      setOpenUser(true);
    },
    [userForm, getRolePermsById]
  );

  const sendResetMail = useCallback(
    (email, first = false) => {
      const label = first
        ? t("rolesList.toasts.initialResetSent", "Initial password setup email sent")
        : t("rolesList.toasts.resetSent", "Password reset email sent");
      messageApi.success(`${label} ${t("rolesList.toasts.toAddress", "to")} ${email}`);
    },
    [messageApi, t]
  );

  const submitUser = async () => {
    const vals = await userForm.validateFields();
    const email = String(vals.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return messageApi.error(t("rolesList.user.email.invalid", "Enter a valid email."));
    }

    const inheritPerms = !!vals.inheritPerms;
    const chosenPerms = inheritPerms ? getRolePermsById(vals.role_id) : vals.permissions || [];

    if (!isAdmin && chosenPerms.some((p) => p.startsWith("agent:"))) {
      return messageApi.warning(t("rolesList.user.agentPermsAdminOnly", "Only Admin can assign Kibundo Agent permissions."));
    }

    const base = {
      role_id: vals.role_id,
      first_name: (vals.first_name || "").trim(),
      last_name: (vals.last_name || "").trim(),
      email,
      state: vals.state || null,
      status: vals.status || "Pending",
      contact_number: vals.contact_number || null,
      password: vals.password,
      isActive: !!vals.isActive,
      permissions: chosenPerms,
      inheritPerms,
      created_at: new Date().toISOString(),
    };

    try {
      if (!USE_API_CREATE_USER) throw new Error("CREATE_USER_DISABLED");

      // Unified backend endpoint for creating users
      const body = {
        first_name: base.first_name,
        last_name: base.last_name,
        email: base.email,
        role_id: base.role_id,
        state: base.state,
      };
      await api.post("/adduser", body);

      messageApi.success(t("rolesList.toasts.userCreated", "User created."));
      sendResetMail(base.email, true);
      setOpenUser(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const status = err?.response?.status;
      const text =
        status === 401
          ? t("rolesList.toasts.unauthorized", "Unauthorized. Check your token (verifyToken).")
          : status === 404
          ? t("rolesList.toasts.endpointMissing", "Endpoint not found. Confirm /adduser is mounted under /api.")
          : t("rolesList.toasts.userCreateError", "API error creating user.");
      messageApi.error(text);
    }
  };

  const toggleUserActive = useCallback(
    async (row) => {
      messageApi.info(t("rolesList.toasts.toggleImplement", "Implement an API endpoint to toggle user active state."));
    },
    [messageApi, t]
  );

  const resetPassword = useCallback(
    (row) => {
      Modal.confirm({
        title: t("rolesList.user.resetConfirm", "Send password reset to {{email}}?", { email: row.email }),
        icon: <KeyOutlined />,
        okText: t("rolesList.actions.send", "Send"),
        cancelText: t("common.cancel", "Cancel"),
        onOk: () => sendResetMail(row.email, false),
      });
    },
    [sendResetMail, t]
  );

  const deleteUser = useCallback(
    (row) => {
      Modal.confirm({
        title: t("rolesList.user.deleteConfirm", "Delete user \"{{email}}\"?", { email: row.email }),
        okType: "danger",
        okText: t("common.delete", "Delete"),
        cancelText: t("common.cancel", "Cancel"),
        onOk: async () => {
          messageApi.info(t("rolesList.toasts.userDeleteImplement", "Implement DELETE /users/:id and call it here."));
        },
      });
    },
    [messageApi, t]
  );

  /* -------------------------------- helpers -------------------------------- */
  const renderPerms = (perms) => {
    const list = Array.isArray(perms) ? perms : [];
    return list.length ? (
      <Space size={[6, 6]} wrap>
        {list.map((code, idx) => {
          const locked = code.startsWith("agent:");
          return (
            <Tag key={`${code}-${idx}`} color={locked ? "geekblue" : "default"}>
              {locked && <LockOutlined style={{ marginRight: 4 }} />}
              {code}
            </Tag>
          );
        })}
      </Space>
    ) : (
      <Tag>-</Tag>
    );
  };

  /* ------------------------------ Roles table columns ------------------------------ */
  const roleColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 90 },
    { title: t("rolesList.columns.role", "Role"), dataIndex: "name", key: "name", ellipsis: true },
    {
      title: t("rolesList.columns.permissions", "Permissions"),
      dataIndex: "permissions",
      key: "permissions",
      ellipsis: true,
      render: (perms) => renderPerms(perms),
    },
    {
      title: "",
      key: "actions",
      width: 72,
      fixed: "right",
      className: "billing-actions-cell",
      render: (_, r) => (
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{
            items: [
              { key: "edit", icon: <EditOutlined />, label: t("common.edit", "Edit") },
              { type: "divider" },
              { key: "delete", icon: <DeleteOutlined />, label: t("common.delete", "Delete"), danger: true },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === "edit") return openEditRole(r);
              if (key === "delete") return deleteRole(r);
            },
          }}
        >
          <Button shape="circle" icon={<MoreOutlined />} data-no-rowclick aria-label={t("common.moreActions", "More actions")} size="small" />
        </Dropdown>
      ),
    },
  ];

  /* ------------------------------ Users columns ------------------------------ */
  const userColumns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 90 },
      {
        title: t("rolesList.columns.first", "First"),
        dataIndex: "first_name",
        key: "first_name",
        width: 160,
        ellipsis: true,
        render: (v, r) => v || <span style={{ opacity: 0.6 }}>{r.email}</span>,
      },
      { title: t("rolesList.columns.last", "Last"), dataIndex: "last_name", key: "last_name", width: 160, ellipsis: true },
      { title: "Email", dataIndex: "email", key: "email", width: 260, ellipsis: true },
      {
        title: t("rolesList.columns.role", "Role"),
        key: "role",
        width: 160,
        render: (_, r) => getRoleById(r.role_id)?.name || r.role_id,
      },
      {
        title: t("rolesList.columns.phone", "Phone"),
        dataIndex: "contact_number",
        key: "contact_number",
        width: 160,
        render: (v) => v || "—",
      },
      {
        title: t("rolesList.columns.status", "Status"),
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (v) => {
          const tag = (v || "Pending").toLowerCase();
          if (tag === "active") return <Tag color="green">{t("common.active", "Active")}</Tag>;
          if (tag === "inactive") return <Tag>{t("common.inactive", "Inactive")}</Tag>;
          return <Tag color="gold">{t("common.pending", "Pending")}</Tag>;
        },
      },
      {
        title: t("rolesList.columns.created", "Created"),
        dataIndex: "created_at",
        key: "created_at",
        width: 190,
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
      {
        title: t("rolesList.columns.permissions", "Permissions"),
        dataIndex: "permissions",
        key: "permissions",
        width: 380,
        ellipsis: true,
        render: (_, r) => renderPerms(r.permissions),
      },
      {
        title: "",
        key: "actions",
        width: 72,
        fixed: "right",
        className: "billing-actions-cell",
        render: (_, u) => {
          const toggleLabel = u.isActive ? t("rolesList.actions.deactivate", "Deactivate") : t("rolesList.actions.activate", "Activate");
          const toggleIcon = u.isActive ? <StopOutlined /> : <PoweroffOutlined />;
          return (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  { key: "reset", icon: <MailOutlined />, label: t("rolesList.actions.resetPassword", "Reset password") },
                  { key: "toggle", icon: toggleIcon, label: toggleLabel },
                  { key: "edit", icon: <EditOutlined />, label: t("common.edit", "Edit") },
                  { type: "divider" },
                  { key: "delete", icon: <DeleteOutlined />, label: t("common.delete", "Delete"), danger: true },
                ],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === "reset") return resetPassword(u);
                  if (key === "toggle") return toggleUserActive(u);
                  if (key === "edit") return openEditUser(u);
                  if (key === "delete") return deleteUser(u);
                },
              }}
            >
              <Button
                shape="circle"
                icon={<MoreOutlined />}
                data-no-rowclick
                aria-label={t("common.moreActions", "More actions")}
                size="small"
              />
            </Dropdown>
          );
        },
      },
    ],
    [getRoleById, resetPassword, toggleUserActive, openEditUser, deleteUser, t]
  );

  /* ------------------------------ derived: users list (filters + search) ------------------------------ */
  const filteredUsers = useMemo(() => {
    const text = (q || "").toLowerCase().trim();
    return users.filter((u) => {
      if (roleFilter && String(u.role_id) !== String(roleFilter)) return false;
      if (statusFilter && (u.status || "Pending") !== statusFilter) return false;
      if (typeof activeFilter === "boolean" && !!u.isActive !== activeFilter) return false;
      if (!text) return true;
      const roleName = getRoleById(u.role_id)?.name || "";
      return [u.first_name, u.last_name, u.email, u.contact_number, roleName, u.status]
        .some((v) => String(v || "").toLowerCase().includes(text));
    });
  }, [users, q, roleFilter, statusFilter, activeFilter, roles, getRoleById]);

  /* --------------------------------- render -------------------------------- */
  const drawerWidth = Math.min(
    720,
    typeof window !== "undefined" ? Math.floor(window.innerWidth - 48) : 720
  );

  return (
    <Space direction="vertical" size="large" className="w-full">
      {contextHolder}
      {/* PAGE HEADER */}
      <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ paddingBottom: 0 }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Title level={3} style={{ margin: 0 }}>
            {t("rolesList.accessControl.title", "Access Control")}
          </Title>
          <Text type="secondary">
            {t("rolesList.accessControl.subtitle", "Manage roles, permissions, and users in one place.")}
          </Text>
          <Divider style={{ margin: "12px 0 0" }} />
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="roles"
        items={[
          {
            key: "roles",
            label: t("rolesList.tabs.roles", "Roles"),
            children: (
              <Card
                title={
                  <Space>
                    <SafetyCertificateOutlined />
                    <span>{t("rolesList.roles.title", "Roles & Permissions")}</span>
                    <Text type="secondary">
                      {t("rolesList.roles.count", "({{count}})", { count: roles.length })}
                    </Text>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>
                      {t("rolesList.roles.new", "New Role")}
                    </Button>
                  </Space>
                }
                styles={{ body: { paddingTop: 12 } }}
              >
                <Table
                  loading={rolesLoading}
                  rowKey={(r) => r.id ?? r.name}
                  columns={roleColumns}
                  dataSource={roles}
                  size="middle"
                  bordered
                  sticky
                  pagination={{ pageSize: 10 }}
                  locale={{
                    emptyText: <Empty description={t("rolesList.empty.roles", "No roles found")} />,
                  }}
                />
              </Card>
            ),
          },
          {
            key: "users",
            label: t("rolesList.tabs.users", "Users"),
            children: (
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    <span>{t("rolesList.users.title", "Users")}</span>
                    <Text type="secondary">
                      {t("rolesList.users.count", "({{count}})", { count: filteredUsers.length })}
                    </Text>
                  </Space>
                }
                extra={
                  <Space>
                    <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateUser}>
                      {t("rolesList.users.new", "New User")}
                    </Button>
                  </Space>
                }
                styles={{ body: { paddingTop: 12 } }}
              >
                {/* Filters toolbar */}
                <div style={{ marginBottom: 12 }}>
                  <Space wrap>
                    <Input.Search
                      allowClear
                      placeholder={t("rolesList.filters.search", "Search name, email, phone, role…")}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      style={{ width: 320 }}
                    />
                    <Select
                      allowClear
                      placeholder={t("rolesList.filters.role", "Filter by role")}
                      options={roleSelectOptions}
                      value={roleFilter}
                      onChange={setRoleFilter}
                      style={{ width: 200 }}
                    />
                    <Select
                      allowClear
                      placeholder={t("rolesList.filters.status", "Status")}
                      options={[
                        { value: "Pending", label: t("common.pending", "Pending") },
                        { value: "Active", label: t("common.active", "Active") },
                        { value: "Inactive", label: t("common.inactive", "Inactive") },
                      ]}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 160 }}
                    />
                    <Segmented
                      options={[
                        { label: t("common.all", "All"), value: "all" },
                        { label: t("common.active", "Active"), value: "true" },
                        { label: t("common.inactive", "Inactive"), value: "false" },
                      ]}
                      value={typeof activeFilter === "boolean" ? (activeFilter ? "true" : "false") : "all"}
                      onChange={(val) => setActiveFilter(val === "all" ? undefined : val === "true")}
                    />
                  </Space>
                </div>

                <Table
                  loading={usersLoading}
                  rowKey={(r) => r.id}
                  columns={userColumns}
                  dataSource={filteredUsers}
                  size="middle"
                  bordered
                  sticky
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: <Empty description={t("rolesList.empty.users", "No users found")} /> }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* DRAWER: Create / Edit Role */}
      <Drawer
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>{editingRole ? t("rolesList.role.edit", "Edit Role") : t("rolesList.role.create", "Create Role")}</span>
          </Space>
        }
        open={openRole}
        onClose={() => {
          setOpenRole(false);
          setEditingRole(null);
        }}
        width={drawerWidth}
        destroyOnClose
        footer={
          <Space style={{ float: "right" }}>
            <Button onClick={() => { setOpenRole(false); setEditingRole(null); }}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={submitRole}>
              {editingRole ? t("common.saveChanges", "Save Changes") : t("common.save", "Save")}
            </Button>
          </Space>
        }
      >
        <Form
          form={roleForm}
          layout="vertical"
          initialValues={{ permissions: ["users:read"] }}
          requiredMark="optional"
        >
          <Form.Item
            name="name"
            label={t("rolesList.role.name.label", "Role Name")}
            rules={[
              { required: true, message: t("rolesList.role.name.required", "Role name is required") },
              { max: 50, message: t("rolesList.role.name.maxLength", "Keep it under 50 characters") },
            ]}
          >
            <Input placeholder={t("rolesList.role.name.placeholder", "e.g. Content Manager")} />
          </Form.Item>

          <Form.Item
            name="permissions"
            label={t("rolesList.columns.permissions", "Permissions")}
            rules={[{ required: true, message: t("rolesList.role.permissions.required", "Select at least one permission") }]}
            tooltip={t("rolesList.role.permissions.adminOnly", "Only Admin can edit 'agent:*' (Kibundo) permissions")}
          >
            <Select mode="multiple" placeholder={t("rolesList.role.permissions.placeholder", "Select permissions")} options={permOptions} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* DRAWER: Create / Edit User */}
      <Drawer
        title={
          <Space>
            <TeamOutlined />
            <span>{editingUser ? t("rolesList.user.edit", "Edit User") : t("rolesList.user.create", "Create User")}</span>
          </Space>
        }
        open={openUser}
        onClose={() => {
          setOpenUser(false);
          setEditingUser(null);
        }}
        width={drawerWidth}
        destroyOnClose
        footer={
          <Space style={{ float: "right" }}>
            <Button onClick={() => { setOpenUser(false); setEditingUser(null); }}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={submitUser}>
              {editingUser ? t("common.saveChanges", "Save Changes") : t("rolesList.actions.createAndSendReset", "Create & send reset")}
            </Button>
          </Space>
        }
      >
        <Form
          form={userForm}
          layout="vertical"
          initialValues={{ status: "Pending", isActive: true, inheritPerms: true }}
          onValuesChange={(changed) => {
            if (Object.hasOwn(changed, "role_id")) {
              const current = userForm.getFieldsValue();
              if (current.inheritPerms) {
                userForm.setFieldsValue({ permissions: getRolePermsById(changed.role_id) });
              }
            }
            if (Object.hasOwn(changed, "inheritPerms") && changed.inheritPerms === true) {
              const current = userForm.getFieldsValue();
              userForm.setFieldsValue({ permissions: getRolePermsById(current.role_id) });
            }
          }}
          requiredMark="optional"
        >
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <Form.Item name="first_name" label={t("rolesList.user.firstName", "First Name")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label={t("rolesList.user.lastName", "Last Name")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            {/* Contact + Email */}
            <Form.Item name="contact_number" label={t("rolesList.user.contactNumber", "Contact Number")}>
              <Input placeholder="+1 555 000 0000" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: t("rolesList.user.email.required", "Email is required") },
                { type: "email", message: t("rolesList.user.email.invalid", "Enter a valid email") },
              ]}
            >
              <Input placeholder="user@example.com" />
            </Form.Item>

            {/* Role & status & active */}
            <Form.Item name="role_id" label={t("rolesList.columns.role", "Role")} rules={[{ required: true }]}>
              <Select
                placeholder={t("rolesList.user.role.placeholder", "Select a role")}
                options={roleSelectOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="state" label={t("rolesList.user.state", "State (Bundesland)")}>
              <Input placeholder={t("rolesList.user.state.placeholder", "e.g. Bayern")} />
            </Form.Item>
            <Form.Item name="status" label={t("rolesList.columns.status", "Status")} tooltip={t("rolesList.user.status.tooltip", "Back-end string; default is 'Pending'")}>
              <Select
                options={[
                  { value: "Pending", label: t("common.pending", "Pending") },
                  { value: "Active", label: t("common.active", "Active") },
                  { value: "Inactive", label: t("common.inactive", "Inactive") },
                ]}
              />
            </Form.Item>

            <Form.Item name="isActive" label={t("rolesList.user.active", "Active?")}>
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          {/* Password */}
          <div className="grid md:grid-cols-2 gap-4">
            <Form.Item
              name="password"
              label={t("rolesList.user.password.label", "Password")}
              rules={[
                { required: !editingUser, message: t("rolesList.user.password.required", "Password is required for new users") },
                { min: 6, message: t("rolesList.user.password.minLength", "Use at least 6 characters") },
              ]}
            >
              <Input.Password placeholder={editingUser ? t("rolesList.user.password.keepCurrent", "(leave blank to keep current)") : t("rolesList.user.password.placeholder", "Set a password")} />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label={t("rolesList.user.confirmPassword", "Confirm Password")}
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const pass = getFieldValue("password");
                    if (!pass && editingUser) return Promise.resolve();
                    if (value && value === pass) return Promise.resolve();
                    return Promise.reject(new Error(t("rolesList.user.passwordsMismatch", "Passwords do not match")));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
          </div>

          <Divider />

          {/* Permissions control */}
          <Form.Item
            label={t("rolesList.columns.permissions", "Permissions")}
            tooltip={t("rolesList.user.permissions.tooltip", "Inherit from selected role or override with a custom set.")}
            style={{ marginBottom: 8 }}
          >
            <Space align="center" wrap>
              <Form.Item name="inheritPerms" noStyle valuePropName="checked">
                <Switch />
              </Form.Item>
              <span>{t("rolesList.user.inheritFromRole", "Inherit from role")}</span>
            </Space>
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev.inheritPerms !== cur.inheritPerms || prev.role_id !== cur.role_id}>
            {({ getFieldValue }) => {
              const inherit = !!getFieldValue("inheritPerms");
              return (
                <Form.Item
                  name="permissions"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (inherit) return Promise.resolve();
                        if (!value || !value.length) {
                          return Promise.reject(
                            new Error(t("rolesList.user.permissions.validator", "Select at least one permission or enable 'Inherit from role'"))
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder={
                      inherit
                        ? t("rolesList.user.inheritingFromRole", "Inheriting from role…")
                        : t("rolesList.user.permissions.placeholder", "Select permissions")
                    }
                    options={permOptions}
                    disabled={inherit}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
