import { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  DatePicker,
  Select,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Card,
} from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const isAdmin = true; // Replace with real role check

  useEffect(() => {
    axios.get("/api/contracts")
      .then((res) => {
        setContracts(res.data);
        setFiltered(res.data);
      })
      .catch(() => message.error("Failed to load contracts"));
  }, []);

  // Filtering
  useEffect(() => {
    let data = contracts;

    if (search)
      data = data.filter((c) =>
        c.contractName.toLowerCase().includes(search.toLowerCase())
      );

    if (category !== "all")
      data = data.filter((c) => c.category === category);

    setFiltered(data);
  }, [search, category, contracts]);

  const handleDelete = (id) => {
    axios.delete(`/api/contracts/${id}`)
      .then(() => {
        setContracts(prev => prev.filter(c => c.id !== id));
        message.success("Contract deleted");
      })
      .catch(() => message.error("Delete failed"));
  };

  const handleDownloadPDF = async (record) => {
    const element = document.createElement("div");
    element.innerHTML = `
      <h3>${record.contractName}</h3>
      <p><strong>Party:</strong> ${record.party}</p>
      <p><strong>Category:</strong> ${record.category}</p>
      <p><strong>Status:</strong> ${record.status}</p>
      <p><strong>Start:</strong> ${record.startDate}</p>
      <p><strong>End:</strong> ${record.endDate}</p>
    `;
    document.body.appendChild(element);
    const canvas = await html2canvas(element);
    const pdf = new jsPDF();
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 10, 10);
    pdf.save(`${record.contractName}.pdf`);
    document.body.removeChild(element);
  };

  const columns = [
    {
      title: "Contract Name",
      dataIndex: "contractName",
      key: "contractName",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Party",
      dataIndex: "party",
      key: "party",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : status === "Expired" ? "red" : "orange"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "Received On",
      dataIndex: "receivedDate",
      key: "receivedDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View/Download PDF">
            <Button icon={<DownloadOutlined />} onClick={() => handleDownloadPDF(record)} />
          </Tooltip>
          {isAdmin && (
            <>
              <Tooltip title="Edit">
                <Button icon={<EditOutlined />} />
              </Tooltip>
              <Popconfirm
                title="Delete contract?"
                onConfirm={() => handleDelete(record.id)}
              >
                <Tooltip title="Delete">
                  <Button icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900">
      <Card
        className="shadow-sm mb-4"
        title="📄 Contract Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            New Contract
          </Button>
        }
      >
        <Space className="flex-wrap mb-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            value={category}
            onChange={setCategory}
            style={{ width: 180 }}
          >
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
