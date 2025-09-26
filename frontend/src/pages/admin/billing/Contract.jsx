// src/pages/billing/Contract.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Typography,
  Space,
  Input,
  Select,
  Button,
  Dropdown,
  Tag,
  Descriptions,
  Drawer,
  Modal,
  message,
} from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import BillingEntityList from "@/components/billing/BillingEntityList";
import ConfirmDrawer from "@/components/common/ConfirmDrawer";
import useResponsiveDrawerWidth from "@/hooks/useResponsiveDrawerWidth";

const { Text } = Typography;
const { Option } = Select;

/* keep drawers under a fixed top header */
const HEADER_OFFSET = 64;

/** -------------------- Dummy Data -------------------- */
const DUMMY_CONTRACTS = [
  { id: 1, contractName: "Learner Support – 2025/26", party: "St. Martin GS", category: "Service",    status: "Active",  startDate: "2025-07-01", endDate: "2026-06-30", receivedDate: "2025-06-15" },
  { id: 2, contractName: "EdTech Consulting Q3",       party: "Land Berlin",  category: "Consulting", status: "Pending", startDate: "2025-09-01", endDate: "2025-11-30", receivedDate: "2025-08-10" },
  { id: 3, contractName: "SLA – Helpdesk",             party: "Gymnasium Süd",category: "Support",    status: "Active",  startDate: "2025-01-01", endDate: "2025-12-31", receivedDate: "2024-12-20" },
  { id: 4, contractName: "Content Localization",       party: "Freistaat Bayern", category: "Service",status: "Expired", startDate: "2024-01-01", endDate: "2024-12-31", receivedDate: "2023-12-18" },
  { id: 5, contractName: "STEM Workshop Series",       party: "Realschule Nord", category: "Consulting", status: "Active", startDate: "2025-03-01", endDate: "2025-10-31", receivedDate: "2025-02-15" },
  { id: 6, contractName: "After-school Program",       party: "City of Hamburg", category: "Service", status: "Pending", startDate: "2025-09-15", endDate: "2026-06-15", receivedDate: "2025-08-28" },
  { id: 7, contractName: "Platform Uptime Review",     party: "Schulamt Köln", category: "Support",  status: "Expired", startDate: "2024-05-01", endDate: "2025-04-30", receivedDate: "2024-04-15" },
  { id: 8, contractName: "Digital Literacy Pilot",     party: "Land Hessen",   category: "Consulting", status: "Active", startDate: "2025-02-01", endDate: "2025-12-15", receivedDate: "2025-01-17" },
];

/* -------------------- helpers -------------------- */
const statusTag = (s) => {
  const color =
    s === "Active" ? "green" : s === "Pending" ? "orange" : s === "Expired" ? "red" : "default";
  return <Tag color={color}>{s}</Tag>;
};

const fmtDate = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "—");

/* -------------------- component -------------------- */
export default function Contracts() {
  const drawerWidth = useResponsiveDrawerWidth();
  const isAdmin = true; // TODO: RBAC

  const [contracts, setContracts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // view drawer
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRec, setViewRec] = useState(null);

  // confirm drawers
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  /* seed dummy */
  useEffect(() => {
    setContracts(DUMMY_CONTRACTS);
  }, []);

  /* filter list */
  const filtered = useMemo(() => {
    let data = contracts;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          (c.contractName || "").toLowerCase().includes(q) ||
          (c.party || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") data = data.filter((c) => c.category === category);
    return data;
  }, [contracts, search, category]);

  const onRefresh = () => {
    setSearch("");
    setCategory("all");
    // if this pulled from API, trigger refetch here
  };

  /* ---------------- view / edit / delete ---------------- */
  const openView = useCallback(
    (idOrRecord) => {
      const id = typeof idOrRecord === "object" ? idOrRecord.id : idOrRecord;
      const rec = contracts.find((c) => String(c.id) === String(id));
      if (!rec) return message.error("Contract not found.");
      setViewRec(rec);
      setViewOpen(true);
    },
    [contracts]
  );

  const closeView = () => {
    setViewOpen(false);
    setViewRec(null);
  };

  const handleEdit = (record) => {
    message.info(`Edit "${record.contractName}" (stub)`);
    // TODO: open edit drawer/modal when you wire it
  };

  const removeOne = (id) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
    setSelectedRowKeys((ks) => ks.filter((k) => k !== id));
    if (viewRec?.id === id) closeView();
    message.success("Contract deleted");
  };

  const askDelete = (record) => {
    setConfirmTarget(record);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget?.id) return;
    try {
      setConfirmLoading(true);
      // simulate API delete
      removeOne(confirmTarget.id);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmBulk = async () => {
    try {
      setBulkLoading(true);
      // simulate API deletes
      setContracts((prev) => prev.filter((c) => !selectedRowKeys.includes(c.id)));
      if (viewRec && selectedRowKeys.includes(viewRec.id)) closeView();
      setSelectedRowKeys([]);
      message.success("Selected contracts deleted");
      setBulkOpen(false);
    } finally {
      setBulkLoading(false);
    }
  };

  /* ---------------- PDF ---------------- */
  const handleDownloadPDF = async (record) => {
    const el = document.createElement("div");
    el.style.padding = "16px";
    el.style.background = "#fff";
    el.style.width = "600px";
    el.innerHTML = `
      <h2 style="margin:0 0 12px 0;">${record.contractName}</h2>
      <p><b>Party:</b> ${record.party}</p>
      <p><b>Category:</b> ${record.category}</p>
      <p><b>Status:</b> ${record.status}</p>
      <p><b>Start:</b> ${fmtDate(record.startDate)}</p>
      <p><b>End:</b> ${fmtDate(record.endDate)}</p>
      <p><b>Received On:</b> ${fmtDate(record.receivedDate)}</p>
    `;
    document.body.appendChild(el);
    const canvas = await html2canvas(el);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const ratio = pageW / canvas.width;
    pdf.addImage(img, "PNG", 20, 20, pageW - 40, canvas.height * ratio - 40);
    pdf.save(`${record.contractName}.pdf`);
    document.body.removeChild(el);
  };

  /* ---------------- columns map for BillingEntityList ---------------- */
  const COLUMNS_MAP = useMemo(() => {
    const id = {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: (a, b) => a.id - b.id,
    };
    const name = {
      title: "Contract Name",
      dataIndex: "contractName",
      key: "name",
      ellipsis: true,
      sorter: (a, b) => String(a.contractName || "").localeCompare(String(b.contractName || "")),
      render: (val, record) =>
        val ? (
          <Button type="link" className="!px-0" onClick={() => openView(record.id)}>
            <Text strong>{val}</Text>
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    };
    const party = {
      title: "Party",
      dataIndex: "party",
      key: "party",
      ellipsis: true,
    };
    const category = {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat) => <Tag color="blue">{cat || "—"}</Tag>,
      width: 140,
    };
    const status = {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => statusTag(s || "—"),
      width: 130,
    };
    const start = {
      title: "Start Date",
      dataIndex: "startDate",
      key: "start",
      render: (d) => fmtDate(d),
      width: 140,
    };
    const end = {
      title: "End Date",
      dataIndex: "endDate",
      key: "end",
      render: (d) => fmtDate(d),
      width: 140,
    };
    const received = {
      title: "Received On",
      dataIndex: "receivedDate",
      key: "received",
      render: (d) => fmtDate(d),
      width: 140,
    };

    return { id, name, party, category, status, start, end, received };
  }, [openView]);

  /* ---------------- dotted actions ---------------- */
  const actionsRender = (record) => (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "pdf",
            label: (
              <span className="flex items-center gap-2" onClick={() => handleDownloadPDF(record)}>
                <DownloadOutlined /> Download PDF
              </span>
            ),
          },
          ...(isAdmin
            ? [
                {
                  key: "edit",
                  label: (
                    <span className="flex items-center gap-2" onClick={() => handleEdit(record)}>
                      <EditOutlined /> Edit
                    </span>
                  ),
                },
                {
                  key: "delete",
                  label: (
                    <span
                      className="flex items-center gap-2 text-red-600"
                      onClick={() => askDelete(record)}
                    >
                      <DeleteOutlined /> Delete
                    </span>
                  ),
                },
              ]
            : []),
        ],
      }}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );

  /* ---------------- toolbars ---------------- */
  const toolbarLeft = (
    <Space wrap>
      <Input
        allowClear
        placeholder="Search by name or party…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 260 }}
      />
      <Select value={category} onChange={setCategory} style={{ width: 200 }}>
        <Option value="all">All Categories</Option>
        <Option value="Service">Service</Option>
        <Option value="Consulting">Consulting</Option>
        <Option value="Support">Support</Option>
      </Select>
    </Space>
  );

  const toolbarRight = (
    <Space wrap>
      {selectedRowKeys.length > 0 && (
        <Button danger icon={<DeleteOutlined />} onClick={() => setBulkOpen(true)}>
          Delete selected
        </Button>
      )}
      <Button type="primary" icon={<PlusOutlined />} onClick={() => Modal.info({ title: "New Contract", content: "TODO: implement create flow" })}>
        New Contract
      </Button>
    </Space>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <BillingEntityList
        title="Contracts"
        data={filtered}
        loading={false}
        columnsMap={COLUMNS_MAP}
        storageKey="contracts.visibleCols.v1"
        defaultVisible={["id", "name", "party", "category", "status", "start", "end", "received"]}
        actionsRender={actionsRender}
        onRefresh={onRefresh}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pageSize={8}
        scrollX={1000}
        onRowClick={(r) => openView(r.id)}   // <- row click opens detail drawer
        tableProps={{
          rowClassName: (_, idx) =>
            idx % 2 === 0
              ? "bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(24,144,255,0.06)]"
              : "hover:bg-[rgba(24,144,255,0.06)]",
        }}
      />

      {/* View Drawer (details) */}
      <Drawer
        title="Contract"
        open={viewOpen}
        onClose={closeView}
        width={drawerWidth}
        style={{ top: HEADER_OFFSET }}
        maskStyle={{ top: HEADER_OFFSET }}
        extra={
          viewRec ? (
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => handleDownloadPDF(viewRec)}>
                PDF
              </Button>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(viewRec)}>
                Edit
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => askDelete(viewRec)}>
                Delete
              </Button>
            </Space>
          ) : null
        }
      >
        {viewRec ? (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="ID">{viewRec.id}</Descriptions.Item>
            <Descriptions.Item label="Contract Name">
              {viewRec.contractName || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Party">{viewRec.party || "—"}</Descriptions.Item>
            <Descriptions.Item label="Category">{viewRec.category || "—"}</Descriptions.Item>
            <Descriptions.Item label="Status">{statusTag(viewRec.status || "—")}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{fmtDate(viewRec.startDate)}</Descriptions.Item>
            <Descriptions.Item label="End Date">{fmtDate(viewRec.endDate)}</Descriptions.Item>
            <Descriptions.Item label="Received On">{fmtDate(viewRec.receivedDate)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">No data.</Text>
        )}
      </Drawer>

      {/* Confirm Drawer: single delete (header close; footer cancel hidden) */}
      <ConfirmDrawer
        open={confirmOpen}
        title="Delete contract?"
        description={
          <>
            This will permanently remove{" "}
            <Text strong>“{confirmTarget?.contractName ?? "—"}”</Text>. This action cannot be undone.
          </>
        }
        loading={confirmLoading}
        confirmText="Delete"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
      />

      {/* Confirm Drawer: bulk delete */}
      <ConfirmDrawer
        open={bulkOpen}
        title="Delete selected contracts?"
        description={
          <>
            You are about to delete <Text strong>{selectedRowKeys.length}</Text>{" "}
            contract{selectedRowKeys.length === 1 ? "" : "s"}. This action cannot be undone.
          </>
        }
        loading={bulkLoading}
        confirmText="Delete all"
        showCloseButton
        cancelText=""
        topOffset={HEADER_OFFSET}
        onConfirm={handleConfirmBulk}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
