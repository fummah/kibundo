// src/pages/admin/RolesLocal.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Tag,
  Space,
  Button,
  Tooltip,
  Switch,
  Segmented,
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
  ReloadOutlined,
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

// Billing table wrapper
import BillingEntityList from "@/components/billing/BillingEntityList";

const { Title, Text } = Typography;

/* ======================= CONFIG ======================= */
// Toggle user creation via API (keep true for DB mode)
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

/* ----------------------------- role-aware endpoints for user create -------- */
const ROLE_CREATE_ENDPOINTS = {
  Admin: "/users",
  Support: "/users",
  Teacher: "/addteacher",
  Student: "/addstudent",
  Parent: "/addparent",
};

const getRoleNameById = (roles, role_id) =>
  roles.find((r) => String(r.id) === String(role_id))?.name || "";

/** Build payload per endpoint (extend with domain fields as your controllers require) */
const buildCreatePayload = (endpoint, base) => {
  return {
    role_id: base.role_id,
    first_name: base.first_name,
    last_name: base.last_name,
    email: base.email,
    status: base.status,
    contact_number: base.contact_number,
    password: base.password,
    isActive: base.isActive,
  };
};

/* -------------------------------- component ------------------------------- */
export default function RolesLocal() {
  const [messageApi, contextHolder] = message.useMessage();

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

  const getRoleById = (id) => roles.find((r) => String(r.id) === String(id));
  const getRolePermsById = (id) => {
    const perms = getRoleById(id)?.permissions;
    return Array.isArray(perms) ? perms : [];
  };

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
        permissions: r.permissions,
      }));
      setRoles(normalized);
    } catch (err) {
      console.error("fetchRoles error:", err);
      messageApi.error("Failed to load roles from the database.");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/allusers");
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
      setUsers(normalized);
    } catch (err) {
      console.error("fetchUsers error:", err);
      messageApi.error("Failed to load users from the database.");
    } finally {
      setUsersLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchRoles(), fetchUsers()]);
    messageApi.success("Reloaded from database.");
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
    console.log(vals);
    const payload = {
      role_name: String(vals.name || "").trim(),
      permissions: String(vals.permissions || "").trim(),
    };
    if (!payload.role_name) return messageApi.error("Role name is required.");
    if (!isAdmin && payload.permissions.some((p) => p.startsWith("agent:"))) {
      return messageApi.warning("Only Admin can edit Kibundo Agent permissions.");
    }

    try {
      if (editingRole) {
        await trySeveral(
          ROLE_API.update(editingRole.id).map((url) => () => api.put(url, payload))
        );
        messageApi.success("Role updated.");
      } else {
        await trySeveral(ROLE_API.create.map((url) => () => api.post(url, payload)));
        messageApi.success("Role created.");
      }
      setOpenRole(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      console.error("role submit error:", err);
      if (err?.response?.status === 404) {
        messageApi.error("Your API does not expose create/update role endpoints yet. Only listing is available.");
      } else {
        messageApi.error("Failed to save role.");
      }
    }
  };

  const deleteRole = (row) => {
    Modal.confirm({
      title: `Delete role “${row.name}”?`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await trySeveral(ROLE_API.delete(row.id).map((url) => () => api.delete(url)));
          messageApi.success("Role deleted.");
          fetchRoles();
        } catch (err) {
          console.error("delete role error:", err);
          if (err?.response?.status === 404) {
            messageApi.error("Your API does not expose delete role endpoint.");
          } else {
            messageApi.error("Failed to delete role.");
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

  const openEditUser = (row) => {
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
  };

  const sendResetMail = (email, first = false) => {
    const label = first ? "Initial password setup email sent" : "Password reset email sent";
    messageApi.success(`${label} to ${email}`);
  };

  const submitUser = async () => {
    const vals = await userForm.validateFields();
    const email = String(vals.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return messageApi.error("Enter a valid email.");
    }

    const inheritPerms = !!vals.inheritPerms;
    const chosenPerms = inheritPerms ? getRolePermsById(vals.role_id) : vals.permissions || [];

    if (!isAdmin && chosenPerms.some((p) => p.startsWith("agent:"))) {
      return messageApi.warning("Only Admin can assign Kibundo Agent permissions.");
    }

    const base = {
      role_id: vals.role_id,
      first_name: vals.first_name.trim(),
      last_name: vals.last_name.trim(),
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
      // Use unified backend endpoint for creating users
      const body = {
        first_name: base.first_name,
        last_name: base.last_name,
        email: base.email,
        role_id: base.role_id,
        state: base.state,
      };
      await api.post("/adduser", body);

      messageApi.success("User created.");
      sendResetMail(base.email, true);
      setOpenUser(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const text =
        status === 401
          ? "Unauthorized. Check your token (verifyToken)."
          : status === 404
          ? "Endpoint not found. Confirm /adduser is mounted under /api."
          : "API error creating user.";
      messageApi.error(text);
    }
  };

  const toggleUserActive = async (row) => {
    messageApi.info("Implement an API endpoint to toggle user active state.");
  };

  const resetPassword = (row) => {
    Modal.confirm({
      title: `Send password reset to ${row.email}?`,
      icon: <KeyOutlined />,
      onOk: () => sendResetMail(row.email, false),
    });
  };

  const deleteUser = (row) => {
    Modal.confirm({
      title: `Delete user “${row.email}”?`,
      okType: "danger",
      okText: "Delete",
      onOk: async () => {
        messageApi.info("Implement DELETE /users/:id and call it here.");
      },
    });
  };

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
    { title: "Role", dataIndex: "name", key: "name", ellipsis: true },
    { title: "Permissions", dataIndex: "permissions",key: "permissions", ellipsis: true},
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
              { key: "edit", icon: <EditOutlined />, label: "Edit" },
              { type: "divider" },
              { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === "edit") return openEditRole(r);
              if (key === "delete") return deleteRole(r);
            },
          }}
        >
          <Button
            shape="circle"
            icon={<MoreOutlined />}
            data-no-rowclick
            aria-label="More actions"
            size="small"
          />
        </Dropdown>
      ),
    },
  ];

  /* ------------------------------ Users columns map (for BillingEntityList) ------------------------------ */
  const usersColumnsMap = useMemo(() => {
    return {
      first_name: {
        title: "First",
        dataIndex: "first_name",
        key: "first_name",
        render: (v, r) => v || <span style={{ opacity: 0.6 }}>{r.email}</span>,
        width: 160,
        ellipsis: true,
      },
      last_name: {
        title: "Last",
        dataIndex: "last_name",
        key: "last_name",
        width: 160,
        ellipsis: true,
      },
      email: {
        title: "Email",
        dataIndex: "email",
        key: "email",
        width: 260,
        ellipsis: true,
      },
      role: {
        title: "Role",
        key: "role",
        width: 160,
        render: (_, r) => getRoleById(r.role_id)?.name || r.role_id,
      },
      contact_number: {
        title: "Phone",
        dataIndex: "contact_number",
        key: "contact_number",
        width: 160,
        render: (v) => v || "—",
      },
      status: {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (v) => {
          const tag = (v || "Pending").toLowerCase();
          if (tag === "active") return <Tag color="green">Active</Tag>;
          if (tag === "inactive") return <Tag>Inactive</Tag>;
          return <Tag color="gold">Pending</Tag>;
        },
      },
      isActive: {
        title: "Active?",
        dataIndex: "isActive",
        key: "isActive",
        width: 120,
        render: (v) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
      },
      created_at: {
        title: "Created",
        dataIndex: "created_at",
        key: "created_at",
        width: 190,
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
      permissions: {
        title: "Permissions",
        key: "permissions",
        render: (_, r) => renderPerms(r.permissions),
        width: 380,
      },
    };
  }, [roles]);

  const defaultVisibleUserCols = [
    "first_name",
    "last_name",
    "email",
    "role",
    "status",
    "isActive",
    "created_at",
  ];

  /* ------------------------------ derived: users list (filters + search) ------------------------------ */
  const filteredUsers = useMemo(() => {
    const text = (q || "").toLowerCase().trim();
    return users.filter((u) => {
      if (roleFilter && String(u.role_id) !== String(roleFilter)) return false;
      if (statusFilter && (u.status || "Pending") !== statusFilter) return false;
      if (typeof activeFilter === "boolean" && !!u.isActive !== activeFilter) return false;
      if (!text) return true;
      const roleName = getRoleById(u.role_id)?.name || "";
      return [u.first_name, u.last_name, u.email, u.contact_number, roleName, u.status].some((v) =>
        String(v || "").toLowerCase().includes(text)
      );
    });
  }, [users, q, roleFilter, statusFilter, activeFilter, roles]);

  /* --------------------------------- render -------------------------------- */
  const drawerWidth = Math.min(
    720,
    typeof window !== "undefined" ? Math.floor(window.innerWidth - 48) : 720
  );

  return (
    <Space direction="vertical" size="large" className="w-full">
      {contextHolder}
      {/* PAGE HEADER */}
      <Card bordered={false} style={{ paddingBottom: 0 }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Title level={3} style={{ margin: 0 }}>
            Access Control
          </Title>
          <Text type="secondary">Manage roles, permissions, and users in one place.</Text>
          <Divider style={{ margin: "12px 0 0" }} />
        </Space>
      </Card>

      {/* ROLES */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>Roles & Permissions</span>
            <Text type="secondary">({roles.length})</Text>
          </Space>
        }
        extra={
          <Space wrap>
            <Tooltip title="Reload roles & users from database">
              <Button icon={<ReloadOutlined />} onClick={refreshAll} />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>
              New Role
            </Button>
          </Space>
        }
        bodyStyle={{ paddingTop: 12 }}
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
          locale={{ emptyText: <Empty description="No roles found" /> }}
        />
      </Card>

      {/* USERS */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Users</span>
            <Text type="secondary">({filteredUsers.length})</Text>
          </Space>
        }
        extra={
          <Space>
            <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateUser}>
              New User
            </Button>
            <Tooltip title="Reload users from database">
              <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
            </Tooltip>
          </Space>
        }
        bodyStyle={{ paddingTop: 12 }}
      >
        <BillingEntityList
          title={null}
          data={filteredUsers}
          loading={usersLoading}
          rowKey={(r) => r.id}
          columnsMap={usersColumnsMap}
          storageKey="admin.users.columns.v1"
          defaultVisible={defaultVisibleUserCols}
          actionsWidth={80}
          actionsFixed="right"
          onRefresh={fetchUsers}
          onRowClick={(rec) => openEditUser(rec)}
          // Toolbar left: search + filters
          toolbarLeft={
            <Space wrap>
              <Input.Search
                allowClear
                placeholder="Search name, email, phone, role…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ width: 320 }}
              />
              <Select
                allowClear
                placeholder="Filter by role"
                options={roleSelectOptions}
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 200 }}
              />
              <Select
                allowClear
                placeholder="Status"
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
              />
              <Segmented
                options={[
                  { label: "All", value: "all" },
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" },
                ]}
                value={typeof activeFilter === "boolean" ? (activeFilter ? "true" : "false") : "all"}
                onChange={(val) => setActiveFilter(val === "all" ? undefined : val === "true")}
              />
            </Space>
          }
          // Toolbar right: create + reload (Column picker comes from BillingEntityList)
          toolbarRight={
            <Space>
              <Button onClick={openCreateUser} type="primary" icon={<UserAddOutlined />}>
                New User
              </Button>
              <Tooltip title="Reload users">
                <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
              </Tooltip>
            </Space>
          }
          // Actions column: single dotted menu button
          actionsRender={(u) => {
            const toggleLabel = u.isActive ? "Deactivate" : "Activate";
            const toggleIcon = u.isActive ? <StopOutlined /> : <PoweroffOutlined />;

            return (
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    { key: "reset", icon: <MailOutlined />, label: "Reset password" },
                    { key: "toggle", icon: toggleIcon, label: toggleLabel },
                    { key: "edit", icon: <EditOutlined />, label: "Edit" },
                    { type: "divider" },
                    { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true },
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
                  aria-label="More actions"
                  size="small"
                />
              </Dropdown>
            );
          }}
          pageSize={20}
          scrollX={1200}
          size="middle"
          bordered
          sticky
          showColumnPicker
          headerNote={null}
        />
      </Card>

      {/* DRAWER: Create / Edit Role */}
      <Drawer
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>{editingRole ? "Edit Role" : "Create Role"}</span>
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
              Cancel
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={submitRole}>
              {editingRole ? "Save Changes" : "Save"}
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
            label="Role Name"
            rules={[
              { required: true, message: "Role name is required" },
              { max: 50, message: "Keep it under 50 characters" },
            ]}
          >
            <Input placeholder="e.g. Content Manager" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
            rules={[{ required: true, message: "Select at least one permission" }]}
            tooltip="Only Admin can edit 'agent:*' (Kibundo) permissions"
          >
            <Select mode="multiple" placeholder="Select permissions" options={permOptions} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* DRAWER: Create / Edit User */}
      <Drawer
        title={
          <Space>
            <TeamOutlined />
            <span>{editingUser ? "Edit User" : "Create User"}</span>
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
              Cancel
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={submitUser}>
              {editingUser ? "Save Changes" : "Create & Send Reset"}
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
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            {/* Contact + Email */}
            <Form.Item name="contact_number" label="Contact Number">
              <Input placeholder="+1 555 000 0000" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="user@example.com" />
            </Form.Item>

            {/* Role & status & active */}
            <Form.Item name="role_id" label="Role" rules={[{ required: true }]}>
              <Select
                placeholder="Select a role"
                options={roleSelectOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="state" label="State (Bundesland)">
              <Input placeholder="e.g. Bayern" />
            </Form.Item>
            <Form.Item name="status" label="Status" tooltip="Back-end string; default is 'Pending'">
              <Select
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
            </Form.Item>

            <Form.Item name="isActive" label="Active?">
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          {/* Password */}
          <div className="grid md:grid-cols-2 gap-4">
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: !editingUser, message: "Password is required for new users" },
                { min: 6, message: "Use at least 6 characters" },
              ]}
            >
              <Input.Password placeholder={editingUser ? "(leave blank to keep current)" : "Set a password"} />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label="Confirm Password"
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const pass = getFieldValue("password");
                    if (!pass && editingUser) return Promise.resolve();
                    if (value && value === pass) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
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
            label="Permissions"
            tooltip="Inherit from selected role or override with a custom set."
            style={{ marginBottom: 8 }}
          >
            <Space align="center" wrap>
              <Form.Item name="inheritPerms" noStyle valuePropName="checked">
                <Switch />
              </Form.Item>
              <span>Inherit from role</span>
            </Space>
          </Form.Item>

          <Form.Item
            shouldUpdate={(prev, cur) => prev.inheritPerms !== cur.inheritPerms || prev.role_id !== cur.role_id}
            style={{ marginBottom: 0 }}
          >
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
                            new Error("Select at least one permission or enable 'Inherit from role'")
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder={inherit ? "Inheriting from role…" : "Select permissions"}
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
