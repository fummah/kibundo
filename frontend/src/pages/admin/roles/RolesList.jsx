// src/pages/admin/RolesLocal.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Select,
  Input,
  message,
  Empty,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UndoOutlined,
  SaveOutlined,
  EditOutlined,
  MailOutlined,
  UserAddOutlined,
  StopOutlined,
  PoweroffOutlined,
  KeyOutlined,
  LockOutlined,
} from "@ant-design/icons";

/* ----------------------------- constants/mock ----------------------------- */
const ROLE_OPTIONS = ["Support", "Teacher", "Student", "Parent", "Developer", "Admin"].map((r) => ({
  value: r,
  label: r,
}));

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
  "agent:*", // ← Kibundo Agent (locked to Admin)
];

const DUMMY_ROLES = [
  { id: 1, name: "Admin",   permissions: ["users:read", "users:write:suspend", "billing:read", "billing:write", "agent:*"] },
  { id: 2, name: "Support", permissions: ["users:read", "support:tickets:*", "billing:read"] },
  { id: 3, name: "Teacher", permissions: ["academics:*", "users:read"] },
];

const STORAGE_KEY_ROLES = "roles_local_v2";
const STORAGE_KEY_USERS = "roles_local_users_v1";

/* ----------------------------- helpers/security ---------------------------- */
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

/* -------------------------------- component ------------------------------- */
export default function RolesLocal() {
  /* ------------------------------- roles state ------------------------------ */
  const [roles, setRoles] = useState([]);
  const [openRole, setOpenRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm] = Form.useForm();

  /* ------------------------------- users state ------------------------------ */
  const [users, setUsers] = useState([]);
  const [openUser, setOpenUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  /* ------------------------------ storage I/O ------------------------------ */
  const loadRoles = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ROLES);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saveRoles = (data) => localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(data));

  const loadUsers = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saveUsers = (data) => localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(data));

  /* --------------------------------- init --------------------------------- */
  useEffect(() => {
    const r = loadRoles();
    if (Array.isArray(r) && r.length) {
      setRoles(r);
    } else {
      setRoles(DUMMY_ROLES);
      saveRoles(DUMMY_ROLES);
    }
    const u = loadUsers();
    setUsers(Array.isArray(u) ? u : []);
  }, []);

  /* -------------------------- role select options -------------------------- */
  const isAdmin = isAdminUser();

  const roleSelectOptions = useMemo(() => {
    const base = ROLE_OPTIONS.map((o) =>
      !isAdmin && o.value === "Admin" ? { ...o, disabled: true, label: `${o.label} (admin only)` } : o
    );
    // keep legacy value if editing non-standard role
    if (editingRole && editingRole.name && !base.some((o) => o.value === editingRole.name)) {
      return [{ value: editingRole.name, label: editingRole.name, disabled: true }, ...base];
    }
    return base;
  }, [editingRole, isAdmin]);

  /* -------------------------------- actions -------------------------------- */
  const refresh = () => {
    setRoles(loadRoles() || []);
    setUsers(loadUsers() || []);
    message.success("Reloaded from local storage.");
  };

  const resetToDummy = () => {
    Modal.confirm({
      title: "Reset roles to dummy data?",
      okText: "Reset",
      onOk: () => {
        saveRoles(DUMMY_ROLES);
        setRoles(DUMMY_ROLES);
        message.success("Roles reset to dummy data.");
      },
    });
  };

  const clearAllRoles = () => {
    Modal.confirm({
      title: "Delete all local roles?",
      okText: "Delete all",
      okType: "danger",
      onOk: () => {
        saveRoles([]);
        setRoles([]);
        message.success("All local roles cleared.");
      },
    });
  };

  /* ------------------------------- role CRUD ------------------------------- */
  const openCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    roleForm.setFieldsValue({ name: isAdmin ? "Support" : "Support", permissions: ["users:read"] });
    setOpenRole(true);
  };

  const openEditRole = (row) => {
    setEditingRole(row);
    roleForm.resetFields();
    roleForm.setFieldsValue({
      name: row.name,
      permissions: Array.isArray(row.permissions)
        ? row.permissions.map((p) => (typeof p === "string" ? p : p?.code ?? ""))
        : [],
    });
    setOpenRole(true);
  };

  const submitRole = async () => {
    const vals = await roleForm.validateFields();
    const payload = {
      name: vals.name,
      permissions: vals.permissions || [],
    };

    // lock agent:* unless admin
    if (!isAdmin && payload.permissions.some((p) => p.startsWith("agent:"))) {
      message.warning("Only Admin can edit Kibundo Agent permissions.");
      return;
    }

    // unique by name
    const nameTaken = roles.some(
      (r) => r.name.toLowerCase() === payload.name.toLowerCase() && r.id !== editingRole?.id
    );
    if (nameTaken) {
      message.warning("A role with that name already exists.");
      return;
    }

    if (editingRole) {
      const next = roles.map((r) => (r.id === editingRole.id ? { ...r, ...payload } : r));
      setRoles(next);
      saveRoles(next);
      message.success("Role updated locally.");
    } else {
      const newRole = { id: Date.now(), ...payload };
      const next = [newRole, ...roles];
      setRoles(next);
      saveRoles(next);
      message.success("Role added locally.");
    }

    setOpenRole(false);
    setEditingRole(null);
  };

  const deleteRole = (row) => {
    Modal.confirm({
      title: `Delete role “${row.name}”?`,
      okText: "Delete",
      okType: "danger",
      onOk: () => {
        const next = roles.filter((r) => (r.id ?? r.name) !== (row.id ?? row.name));
        setRoles(next);
        saveRoles(next);
        message.success("Role deleted.");
      },
    });
  };

  /* ------------------------------ users CRUD ------------------------------- */
  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({ email: "", role: "Parent", status: "active" });
    setOpenUser(true);
  };

  const openEditUser = (row) => {
    setEditingUser(row);
    userForm.resetFields();
    userForm.setFieldsValue({
      email: row.email,
      role: row.role,
      status: row.status || "active",
    });
    setOpenUser(true);
  };

  const sendResetMail = (email, first = false) => {
    const label = first ? "Initial password setup email sent" : "Password reset email sent";
    message.success(`${label} to ${email}`);
  };

  const submitUser = async () => {
    const vals = await userForm.validateFields();
    const clean = { email: String(vals.email || "").trim().toLowerCase(), role: vals.role, status: vals.status || "active" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) {
      message.error("Enter a valid email.");
      return;
    }
    const exists = users.some((u) => u.email.toLowerCase() === clean.email && u.id !== editingUser?.id);
    if (exists) {
      message.warning("A user with that email already exists.");
      return;
    }

    if (editingUser) {
      const next = users.map((u) => (u.id === editingUser.id ? { ...u, ...clean } : u));
      setUsers(next);
      saveUsers(next);
      message.success("User updated.");
    } else {
      const newUser = {
        id: Date.now(),
        email: clean.email,
        role: clean.role,
        status: clean.status,
        created_at: new Date().toISOString(),
      };
      const next = [newUser, ...users];
      setUsers(next);
      saveUsers(next);
      sendResetMail(newUser.email, true); // first creation → send reset
    }

    setOpenUser(false);
    setEditingUser(null);
  };

  const toggleUserActive = (row) => {
    const next = users.map((u) =>
      u.id === row.id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
    );
    setUsers(next);
    saveUsers(next);
    message.success(row.status === "active" ? "User set inactive. Content remains." : "User reactivated.");
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
      onOk: () => {
        const next = users.filter((u) => u.id !== row.id);
        setUsers(next);
        saveUsers(next);
        message.success("User deleted. Content remains.");
      },
    });
  };

  /* -------------------------------- tables --------------------------------- */
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

  const roleColumns = [
    { title: "Role", dataIndex: "name", key: "name" },
    {
      title: "Permissions",
      key: "perms",
      render: (_, r) => renderPerms(r.permissions),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => openEditRole(r)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button danger icon={<DeleteOutlined />} onClick={() => deleteRole(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const userColumns = [
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) =>
        v === "active" ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (val, rec) => (rec.status || "active") === val,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      width: 200,
    },
    {
      title: "Actions",
      key: "u_actions",
      width: 260,
      render: (_, r) => (
        <Space wrap>
          <Tooltip title="Send reset email">
            <Button icon={<MailOutlined />} onClick={() => resetPassword(r)}>
              Reset
            </Button>
          </Tooltip>
          {r.status === "active" ? (
            <Tooltip title="Set inactive (content remains)">
              <Button icon={<StopOutlined />} onClick={() => toggleUserActive(r)}>
                Inactivate
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Activate user">
              <Button icon={<PoweroffOutlined />} onClick={() => toggleUserActive(r)}>
                Activate
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Delete user (content remains)">
            <Button danger icon={<DeleteOutlined />} onClick={() => deleteUser(r)}>
              Delete
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  /* ------------------------------- perm options ------------------------------ */
  const permOptions = ALL_PERMS.map((p) => {
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
  });

  /* --------------------------------- render -------------------------------- */
  return (
    <Space direction="vertical" size="large" className="w-full">
      {/* ROLES */}
      <Card
        title="Roles & Permissions (Local)"
        extra={
          <Space wrap>
            <Tooltip title="Reload from localStorage">
              <Button icon={<ReloadOutlined />} onClick={refresh} />
            </Tooltip>
            <Tooltip title="Reset to dummy data">
              <Button icon={<UndoOutlined />} onClick={resetToDummy} />
            </Tooltip>
            <Tooltip title="Clear all roles">
              <Button danger icon={<DeleteOutlined />} onClick={clearAllRoles} />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>
              New Role
            </Button>
          </Space>
        }
      >
        <Table
          rowKey={(r) => r.id ?? r.name}
          columns={roleColumns}
          dataSource={roles}
          size="middle"
          locale={{ emptyText: <Empty /> }}
        />

        <Modal
          title={editingRole ? "Edit Role (Local)" : "Create Role (Local)"}
          open={openRole}
          onOk={submitRole}
          onCancel={() => {
            setOpenRole(false);
            setEditingRole(null);
          }}
          destroyOnClose
          okText={editingRole ? "Save Changes" : "Save"}
          okButtonProps={{ icon: <SaveOutlined /> }}
        >
          <Form form={roleForm} layout="vertical" initialValues={{ permissions: ["users:read"] }}>
            <Form.Item name="name" label="Role" rules={[{ required: true, message: "Select a role" }]}>
              <Select
                placeholder="Select a role"
                options={roleSelectOptions}
                showSearch
                optionFilterProp="label"
              />
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
        </Modal>
      </Card>

      {/* USERS */}
      <Card
        title="Users (Local)"
        extra={
          <Space>
            <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateUser}>
              New User
            </Button>
          </Space>
        }
      >
        <Table
          rowKey={(r) => r.id}
          columns={userColumns}
          dataSource={users}
          size="middle"
          locale={{ emptyText: <Empty description="No users yet. Create one to test the flow." /> }}
        />

        <Modal
          title={editingUser ? "Edit User (Local)" : "Create User (Local)"}
          open={openUser}
          onOk={submitUser}
          onCancel={() => {
            setOpenUser(false);
            setEditingUser(null);
          }}
          destroyOnClose
          okText={editingUser ? "Save Changes" : "Create & Send Reset"}
          okButtonProps={{ icon: <SaveOutlined /> }}
        >
          <Form form={userForm} layout="vertical" initialValues={{ status: "active", role: "Parent" }}>
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
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select
                options={ROLE_OPTIONS.map((o) =>
                  !isAdmin && o.value === "Admin" ? { ...o, disabled: true } : o
                )}
              />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </Space>
  );
}
