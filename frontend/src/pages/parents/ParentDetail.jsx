import { useMemo } from "react";
import EntityDetail from "../../components/EntityDetail.jsx"; // ✅ use relative path unless '@' alias is configured
import { Button } from "antd";

/**
 * Parent detail wiring for EntityDetail
 * - Uses your API surface if available (by providing path builders)
 * - Falls back to dummy data inside EntityDetail if endpoints are missing
 */
export default function ParentDetail() {
  // Table columns for Related (Children)
  const relatedColumns = useMemo(() => [
    { title: "Child ID", dataIndex: "id", key: "id", width: 110, render: (v) => v ?? "-" },
    { title: "Name", dataIndex: "name", key: "name", render: (v) => v ?? "-" },
    { title: "Grade", dataIndex: "grade", key: "grade", width: 110, render: (v) => v ?? "-" },
    { title: "State", dataIndex: "bundesland", key: "bundesland", width: 140, render: (v) => v ?? "-" },
    { title: "Unlock Status", dataIndex: "unlockStatus", key: "unlockStatus", width: 140, render: (v) => v ?? "-" },
    { title: "Status", dataIndex: "status", key: "status", width: 120, render: (v) => v ?? "-" },
  ], []);

  // Billing rows renderer
  const billingRows = (p) => {
    const plan = p?.activePlan || {};
    return [
      { label: "Billing Type", value: p?.billing_type || "-" },
      { label: "Billing Email", value: p?.billing_email || "-" },
      { label: "Billing Status", value: p?.billingStatus || "-" },
      { label: "Account Balance (cents)", value: p?.accountBalanceCents ?? "-" },
      { label: "Active Plan", value: plan?.name || "-" },
      { label: "Plan Interval", value: plan?.interval || "-" },
      { label: "Plan Price (cents)", value: plan?.priceCents ?? "-" },
      { label: "Renews On", value: plan?.renewsOn || "-" },
    ];
  };

  const cfg = {
    titleSingular: "Parent",
    routeBase: "/admin/parents",
    idField: "id",
    infoFields: [
      { label: "Name", name: "name" },
      { label: "Email", name: "email" },
      { label: "Phone", name: "phone" },
      { label: "Company", name: "company" },
      { label: "Street", name: "street" },
      { label: "City", name: "city" },
      { label: "ZIP", name: "zip" },
      { label: "State (Bundesland)", name: "bundesland" },
      { label: "Portal Login", name: "portal_login" },
    ],
    topInfo: (e) => [
      <span key="created" className="text-gray-500">Created: {e?.createdAt || "-"}</span>,
      <span key="updated" className="text-gray-500">Updated: {e?.updatedAt || "-"}</span>,
    ],

    api: {
      // ✅ Use your REST if available; otherwise EntityDetail falls back to dummies
      getPath:  (id) => `/parents/${id}`,
      updateStatusPath: (id) => `/parents/${id}/status`,
      removePath: (id) => `/parents/${id}`,
      // Optional: provide performancePath if you have one
      // performancePath: (id) => `/parents/${id}/performance`,

      // Related = children of this parent
      // You can also override in cfg.tabs.related.listPath
    },

    tabs: {
      related: {
        enabled: true,
        label: "Children",
        idField: "id",
        columns: relatedColumns,
        // If your API exists, this will be used (else EntityDetail shows empty/dummy)
        listPath: (id) => `/parents/${id}/children`,
        toolbar: (parent) => (
          <Button size="small" onClick={() => console.log("Add child for parent", parent?.id)}>
            Add Child
          </Button>
        ),
        empty: "No children linked to this parent.",
      },

      billing: {
        enabled: true,
        rows: billingRows,
      },

      // Optional Audit stub; provide your own data/columns if you have an endpoint
      audit: {
        enabled: true,
        label: "Audit Log",
        columns: [
          { title: "Time", dataIndex: "t", key: "t", width: 180, render: (v) => v ?? "-" },
          { title: "Action", dataIndex: "action", key: "action", render: (v) => v ?? "-" },
          { title: "By", dataIndex: "by", key: "by", width: 180, render: (v) => v ?? "-" },
          { title: "Context", dataIndex: "context", key: "context", render: (v) => v ?? "-" },
        ],
        data: [], // leave empty for now; you can wire /parents/:id/audit later
      },

      // Enable Tasks tab with optional API endpoints. Falls back to local dummy if missing.
      tasks: {
        enabled: true,
        label: "Tasks",
        // listPath: (id) => `/parents/${id}/tasks`,
        // createPath: (id) => `/parents/${id}/tasks`,
        // updatePath: (id, taskId) => `/parents/${id}/tasks/${taskId}`,
        // deletePath: (id, taskId) => `/parents/${id}/tasks/${taskId}`,
      },

      // Enable Documents tab. Falls back to local dummies if paths absent.
      documents: {
        enabled: true,
        label: "Documents",
        // listPath: (id) => `/parents/${id}/documents`,
        // uploadPath: (id) => `/parents/${id}/documents`,
        // deletePath: (id, docId) => `/parents/${id}/documents/${docId}`,
        // commentListPath: (id, docId) => `/parents/${id}/documents/${docId}/comments`,
        // commentCreatePath: (id, docId) => `/parents/${id}/documents/${docId}/comments`,
      },

      // Enable Comments/Communication tab. Falls back to local dummy if paths absent.
      communication: {
        enabled: true,
        label: "Comments",
        // listPath: (id) => `/parents/${id}/comments`,
        // createPath: (id) => `/parents/${id}/comments`,
      },
    },
  };

  return <EntityDetail cfg={cfg} />;
}
