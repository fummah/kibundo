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
} from "@ant-design/icons";

// Allowed role options (Select)
const ROLE_OPTIONS = ["Support", "Teacher", "Student", "Parent", "Developer", "Admin"].map((r) => ({
  value: r,
  label: r,
}));

const ALL_PERMS = [
  "blog:*","quiz:*","academics:*","support:tickets:*","users:read","users:write:suspend",
  "billing:read","billing:write","newsletter:*","agent:*"
];

// Seed data for first run (restricted to allowed roles)
const DUMMY_ROLES = [
  { id: 1, name: "Admin",    permissions: ["users:read", "users:write:suspend", "billing:read", "billing:write"] },
  { id: 2, name: "Support",  permissions: ["users:read", "support:tickets:*", "billing:read"] },
  { id: 3, name: "Teacher",  permissions: ["academics:*", "users:read"] },
];

const STORAGE_KEY = "roles_local_v2";

export default function RolesLocal() {
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // null = creating
  const [form] = Form.useForm();

  // --- storage helpers ---
  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saveToStorage = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // --- init ---
  useEffect(() => {
    const existing = loadFromStorage();
    if (existing && Array.isArray(existing)) {
      setRoles(existing);
    } else {
      setRoles(DUMMY_ROLES);
      saveToStorage(DUMMY_ROLES);
    }
  }, []);

  // Options for Select (ensure the current editing role appears even if legacy)
  const roleSelectOptions = useMemo(() => {
    if (editingRole && editingRole.name && !ROLE_OPTIONS.some(o => o.value === editingRole.name)) {
      return [{ value: editingRole.name, label: editingRole.name, disabled: true }, ...ROLE_OPTIONS];
    }
    return ROLE_OPTIONS;
  }, [editingRole]);

  // --- actions ---
  const refresh = () => {
    const data = loadFromStorage();
    setRoles(Array.isArray(data) ? data : []);
    message.success("Reloaded from local storage.");
  };

  const resetToDummy = () => {
    Modal.confirm({
      title: "Reset roles to dummy data?",
      okText: "Reset",
      onOk: () => {
        saveToStorage(DUMMY_ROLES);
        setRoles(DUMMY_ROLES);
        message.success("Roles reset to dummy data.");
      },
    });
  };

  const clearAll = () => {
    Modal.confirm({
      title: "Delete all local roles?",
      okText: "Delete all",
      okType: "danger",
      onOk: () => {
        saveToStorage([]);
        setRoles([]);
        message.success("All local roles cleared.");
      },
    });
  };

  const openCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ name: "Support", permissions: ["users:read"] });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingRole(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      permissions: Array.isArray(row.permissions)
        ? row.permissions.map((p) => (typeof p === "string" ? p : p?.code ?? ""))
        : [],
    });
    setOpen(true);
  };

  const onSubmit = async () => {
    const vals = await form.validateFields();
    const payload = {
      name: vals.name, // strictly from ROLE_OPTIONS
      permissions: vals.permissions || [],
    };

    // Uniqueness guard by role name (case-insensitive)
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
      saveToStorage(next);
      message.success("Role updated locally.");
    } else {
      const newRole = { id: Date.now(), ...payload };
      const next = [newRole, ...roles];
      setRoles(next);
      saveToStorage(next);
      message.success("Role added locally.");
    }

    setOpen(false);
    setEditingRole(null);
  };

  const onDelete = (row) => {
    Modal.confirm({
      title: `Delete role “${row.name}”?`,
      okText: "Delete",
      okType: "danger",
      onOk: () => {
        const next = roles.filter((r) => (r.id ?? r.name) !== (row.id ?? row.name));
        setRoles(next);
        saveToStorage(next);
        message.success("Role deleted.");
      },
    });
  };

  // --- table ---
  const renderPerms = (perms) => {
    const list = Array.isArray(perms) ? perms : [];
    return list.length ? (
      <Space size={[6, 6]} wrap>
        {list.map((code, idx) => (
          <Tag key={`${code}-${idx}`}>{code}</Tag>
        ))}
      </Space>
    ) : (
      <Tag>-</Tag>
    );
  };

  const columns = [
    { title: "Role", dataIndex: "name", key: "name" },
    { title: "Permissions", key: "perms", render: (_, r) => renderPerms(r.permissions) },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Roles & Permissions (Local)"
      variant="outlined"
      extra={
        <Space>
          <Tooltip title="Reload from localStorage">
            <Button icon={<ReloadOutlined />} onClick={refresh} />
          </Tooltip>
          <Tooltip title="Reset to dummy data">
            <Button icon={<UndoOutlined />} onClick={resetToDummy} />
          </Tooltip>
          <Tooltip title="Clear all">
            <Button danger icon={<DeleteOutlined />} onClick={clearAll} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Role
          </Button>
        </Space>
      }
    >
      <Table
        rowKey={(r) => r.id ?? r.name}
        columns={columns}
        dataSource={roles}
        size="middle"
        locale={{ emptyText: <Empty /> }}
      />

      <Modal
        title={editingRole ? "Edit Role (Local)" : "Create Role (Local)"}
        open={open}
        onOk={onSubmit}
        onCancel={() => {
          setOpen(false);
          setEditingRole(null);
        }}
        destroyOnClose
        okText={editingRole ? "Save Changes" : "Save"}
        okButtonProps={{ icon: <SaveOutlined /> }}
      >
        <Form form={form} layout="vertical" initialValues={{ permissions: ["users:read"] }}>
          <Form.Item
            name="name"
            label="Role"
            rules={[{ required: true, message: "Select a role" }]}
          >
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
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
              options={ALL_PERMS.map((p) => ({ value: p, label: p }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
