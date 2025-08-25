// src/pages/billing/Contract.jsx (dummy + dotted actions)
import { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  message,
  Tooltip,
  Card,
  Dropdown,
  Modal,
} from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  MoreOutlined, // ••• horizontal dots
} from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const { Option } = Select;

/** -------------------- Dummy Data -------------------- */
const DUMMY_CONTRACTS = [
  { id: 1, contractName: "Learner Support – 2025/26", party: "St. Martin GS", category: "Service", status: "Active", startDate: "2025-07-01", endDate: "2026-06-30", receivedDate: "2025-06-15" },
  { id: 2, contractName: "EdTech Consulting Q3", party: "Land Berlin", category: "Consulting", status: "Pending", startDate: "2025-09-01", endDate: "2025-11-30", receivedDate: "2025-08-10" },
  { id: 3, contractName: "SLA – Helpdesk", party: "Gymnasium Süd", category: "Support", status: "Active", startDate: "2025-01-01", endDate: "2025-12-31", receivedDate: "2024-12-20" },
  { id: 4, contractName: "Content Localization", party: "Freistaat Bayern", category: "Service", status: "Expired", startDate: "2024-01-01", endDate: "2024-12-31", receivedDate: "2023-12-18" },
  { id: 5, contractName: "STEM Workshop Series", party: "Realschule Nord", category: "Consulting", status: "Active", startDate: "2025-03-01", endDate: "2025-10-31", receivedDate: "2025-02-15" },
  { id: 6, contractName: "After-school Program", party: "City of Hamburg", category: "Service", status: "Pending", startDate: "2025-09-15", endDate: "2026-06-15", receivedDate: "2025-08-28" },
  { id: 7, contractName: "Platform Uptime Review", party: "Schulamt Köln", category: "Support", status: "Expired", startDate: "2024-05-01", endDate: "2025-04-30", receivedDate: "2024-04-15" },
  { id: 8, contractName: "Digital Literacy Pilot", party: "Land Hessen", category: "Consulting", status: "Active", startDate: "2025-02-01", endDate: "2025-12-15", receivedDate: "2025-01-17" },
];

/** -------------------- Component -------------------- */
export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const isAdmin = true; // wire to RBAC later

  // seed dummy
  useEffect(() => {
    setContracts(DUMMY_CONTRACTS);
    setFiltered(DUMMY_CONTRACTS);
  }, []);

  // Filtering
  useEffect(() => {
    let data = contracts;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.contractName.toLowerCase().includes(q) ||
          c.party.toLowerCase().includes(q)
      );
    }
    if (category !== "all") data = data.filter((c) => c.category === category);
    setFiltered(data);
  }, [search, category, contracts]);

  const remove = (id) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
    message.success("Contract deleted");
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: "Delete contract?",
      content: `This will permanently remove “${record.contractName}”.`,
      okType: "danger",
      onOk: () => remove(record.id),
    });
  };

  const handleEdit = (record) => {
    message.info(`Edit "${record.contractName}" (stub)`);
    // TODO: open drawer/modal editor
  };

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
      <p><b>Start:</b> ${dayjs(record.startDate).format("YYYY-MM-DD")}</p>
      <p><b>End:</b> ${dayjs(record.endDate).format("YYYY-MM-DD")}</p>
      <p><b>Received On:</b> ${dayjs(record.receivedDate).format("YYYY-MM-DD")}</p>
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

  const actionItems = (record) => {
    const items = [
      {
        key: "view",
        label: (
          <span className="flex items-center gap-2" onClick={() => handleDownloadPDF(record)}>
            <DownloadOutlined /> View / Download PDF
          </span>
        ),
      },
    ];
    if (isAdmin) {
      items.push(
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
            <span className="flex items-center gap-2 text-red-600" onClick={() => confirmDelete(record)}>
              <DeleteOutlined /> Delete
            </span>
          ),
        }
      );
    }
    return items;
  };

  const columns = [
    { title: "Contract Name", dataIndex: "contractName", key: "contractName", render: (t) => <b>{t}</b> },
    { title: "Party", dataIndex: "party", key: "party" },
    { title: "Category", dataIndex: "category", key: "category", render: (cat) => <Tag color="blue">{cat}</Tag> },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={s === "Active" ? "green" : s === "Expired" ? "red" : "orange"}>{s}</Tag>
      ),
    },
    { title: "Start Date", dataIndex: "startDate", key: "startDate", render: (d) => dayjs(d).format("YYYY-MM-DD") },
    { title: "End Date", dataIndex: "endDate", key: "endDate", render: (d) => dayjs(d).format("YYYY-MM-DD") },
    { title: "Received On", dataIndex: "receivedDate", key: "receivedDate", render: (d) => dayjs(d).format("YYYY-MM-DD") },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Dropdown menu={{ items: actionItems(record) }} trigger={["click"]} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900">
      <Card
        className="shadow-sm mb-4"
        title="📄 Contract Management"
        extra={<Button type="primary" icon={<PlusOutlined />}>New Contract</Button>}
      >
        <Space className="flex-wrap mb-4">
          <Input
            placeholder="Search by name or party…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select value={category} onChange={setCategory} style={{ width: 200 }}>
            <Option value="all">All Categories</Option>
            <Option value="Service">Service</Option>
            <Option value="Consulting">Consulting</Option>
            <Option value="Support">Support</Option>
          </Select>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 6 }}
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
}
