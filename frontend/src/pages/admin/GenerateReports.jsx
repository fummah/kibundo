import React, { useEffect, useRef, useState } from "react";
import {
  Typography,
  Spin,
  message,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  Dropdown,
  Table,
} from "antd";
import {
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import api from "../../api/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Title, Text } = Typography;
const { Option } = Select;

export default function GenerateReportsPage() {
  const [filters, setFilters] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [preview, setPreview] = useState(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef(null);

  // 🔃 Load filter options on mount
  useEffect(() => {
    setLoadingFilters(true);
    api.get("/reports/filters")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setFilters(res.data);
        } else {
          console.error("Invalid filter format:", res.data);
          message.error("Unexpected filter format");
        }
      })
      .catch((err) => {
        console.error("Filter fetch error:", err);
        message.error("Failed to load filters");
      })
      .finally(() => setLoadingFilters(false));
  }, []);

  const handleFilterChange = (key, value) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = () => {
    setGenerating(true);
    setPreview(null); // Reset previous preview
    api.post("/reports/generate", selectedFilters)
      .then((res) => {
        setPreview(res.data);
        message.success("✅ Report generated successfully!");
        setSelectedFilters({}); // Clear filters
        // Scroll to preview section
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      })
      .catch((err) => {
        console.error("Report generation error:", err);
        message.error("❌ Failed to generate report");
      })
      .finally(() => setGenerating(false));
  };

  // 🧾 Export handlers
  const handleExport = (type) => {
    if (!preview?.data || !Array.isArray(preview.data)) return;

    const filename = `${preview.title || "report"}`;

    if (type === "pdf") {
      const doc = new jsPDF();
      doc.text(preview.title || "Generated Report", 10, 10);
      autoTable(doc, {
        startY: 20,
        head: [Object.keys(preview.data[0])],
        body: preview.data.map((row) => Object.values(row)),
      });
      doc.save(`${filename}.pdf`);
    } else if (type === "csv") {
      const csvRows = [
        Object.keys(preview.data[0]).join(","),
        ...preview.data.map((row) => Object.values(row).join(",")),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
    } else if (type === "excel") {
      message.info("Excel export is coming soon!");
    }
  };

  const exportMenu = {
    items: [
      { key: "pdf", label: "Export as PDF" },
      { key: "csv", label: "Export as CSV" },
      { key: "excel", label: "Export as Excel" },
    ],
    onClick: ({ key }) => handleExport(key),
  };

  // 📋 Table columns from data keys
  const columns = preview?.data?.[0]
    ? Object.keys(preview.data[0]).map((key) => ({
        title: key.toUpperCase(),
        dataIndex: key,
        key,
      }))
    : [];

  // 🔍 Check if all filters are selected
  const isFormComplete = filters.every((f) => selectedFilters[f.key]);

  return (
    <div className="p-6 min-h-screen dark:bg-gray-900">
      <Title level={2}>📄 Generate Reports</Title>
      <Text type="secondary">Customize your report using the filters below.</Text>

      {/* 🎛 Filter Section */}
      <Card className="mt-6" title="Filter Options">
        {loadingFilters ? (
          <div className="text-center py-12">
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filters.map((filter, idx) => (
              <Col xs={24} sm={12} md={8} key={idx}>
                <Text strong>{filter.label}</Text>
                <Select
                  style={{ width: "100%" }}
                  placeholder={`Select ${filter.label}`}
                  value={selectedFilters[filter.key] || undefined}
                  onChange={(value) => handleFilterChange(filter.key, value)}
                >
                  {filter.options.map((opt, i) => (
                    <Option key={i} value={opt}>
                      {opt}
                    </Option>
                  ))}
                </Select>
              </Col>
            ))}
          </Row>
        )}

        <div className="mt-6 text-right">
          <Button
            type="primary"
            onClick={handleGenerateReport}
            loading={generating}
            disabled={!isFormComplete}
          >
            Generate Report
          </Button>
        </div>
      </Card>

      {/* 📋 Report Preview */}
      <div ref={previewRef}>
        <Card
          className="mt-8"
          title={
            <Space>
              <FileTextOutlined /> Report Preview
              {preview && (
                <Dropdown menu={exportMenu}>
                  <Button icon={<DownloadOutlined />}>Export</Button>
                </Dropdown>
              )}
            </Space>
          }
          style={{ background: "#fafafa" }}
        >
          {!preview ? (
            <div className="text-center py-10">
              <Text type="secondary">
                No report yet. Select filters and click "Generate Report".
              </Text>
              <div className="mt-4">
                <Button
                  onClick={handleGenerateReport}
                  loading={generating}
                  disabled={!isFormComplete || loadingFilters}
                >
                  Generate Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                dataSource={preview.data}
                columns={columns}
                rowKey={(row) => row.id || Math.random()}
                pagination={{ pageSize: 10 }}
                bordered
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
