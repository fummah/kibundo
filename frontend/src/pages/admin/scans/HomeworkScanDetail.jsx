// src/pages/admin/scans/HomeworkScanDetail.jsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Descriptions, Tag, Button, Image, Typography, Space, Spin, App, Modal } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "@/api/axios";

const { Title, Text, Paragraph } = Typography;

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const fetchScan = async (id) => {
  try {
    console.log("🔍 Fetching scan with ID:", id);
    const response = await api.get(`/homeworkscans/${id}`);
    console.log("✅ Scan fetch response:", response);
    const data = response?.data;
    if (!data) {
      console.warn("⚠️ No data in response");
      throw new Error("Scan not found");
    }
    console.log("📋 Scan data received:", { id: data.id, student_id: data.student_id });
    return data;
  } catch (error) {
    console.error("❌ Error fetching scan:", error);
    console.error("❌ Error response:", error.response);
    if (error.response?.status === 404) {
      throw new Error("Scan not found");
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || "Invalid scan ID");
    }
    throw new Error(error.response?.data?.message || error.message || "Failed to load scan");
  }
};

export default function HomeworkScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  // Try to use prefill data first
  const prefill = location.state?.prefill;
  const prefillData = prefill?.raw || prefill;
  
  const { data: scan, isLoading, error } = useQuery({
    queryKey: ["homeworkScan", id],
    queryFn: () => fetchScan(id),
    enabled: !prefillData || !prefillData.id, // Only fetch if no valid prefill
    initialData: prefillData,
    retry: 1,
  });

  // Use prefill data if available, otherwise use fetched data
  const scanData = prefillData || scan;

  if (isLoading && !prefillData) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (error && !prefillData) {
    return (
      <div className="p-6">
        <Card>
          <Text type="danger">Error loading scan: {error.message}</Text>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="p-6">
        <Card>
          <Text>Scan not found</Text>
          <div className="mt-4">
            <Button onClick={() => navigate("/admin/scans/homework")}>Back to List</Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCompleted = scanData.completed_at || scanData.completion_photo_url;
  const student = scanData.student || {};
  const studentUser = student.user || {};
  const studentName =
    [studentUser.first_name, studentUser.last_name].filter(Boolean).join(" ").trim() ||
    studentUser.name ||
    studentUser.email ||
    (scanData.student_id ? `Student #${scanData.student_id}` : "-");
  
  // Extract grade from student's class if not directly on scan
  const grade = scanData.grade || student.class?.class_name || "-";

  const handleDelete = async () => {
    try {
      await api.delete(`/homeworkscans/${id}`);
      message.success("Scan deleted successfully");
      navigate("/admin/scans/homework");
    } catch (error) {
      console.error("Failed to delete scan:", error);
      message.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to delete scan. Please try again."
      );
    }
  };

  const confirmDelete = () => {
    Modal.confirm({
      title: "Delete Scan?",
      content: (
        <>
          Are you sure you want to permanently delete homework scan{" "}
          <Text strong>#{scanData.id}</Text>? This action cannot be undone.
        </>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: handleDelete,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Space direction="vertical" size="large" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/scans/homework")}>
              Back to List
            </Button>
            <Title level={2} className="!mb-0">
              Homework Scan #{scanData.id}
            </Title>
          </Space>
          <Space>
            <Tag
              color={isCompleted ? "green" : "orange"}
              icon={isCompleted ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              style={{ fontSize: "14px", padding: "4px 12px" }}
            >
              {isCompleted ? "Completed" : "Pending"}
            </Tag>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={confirmDelete}
            >
              Delete Scan
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Image */}
          <Card title="Scan Image" className="h-fit">
            {scanData.file_url ? (() => {
              // Handle different URL formats: base64, absolute URL, or relative path
              const isBase64 = scanData.file_url.startsWith("data:");
              const isAbsolute = scanData.file_url.startsWith("http");
              let imageSrc = scanData.file_url;
              
              if (!isBase64 && !isAbsolute) {
                // If it's a relative path, check if it starts with /
                if (scanData.file_url.startsWith("/")) {
                  // Path already starts with /, use as-is (will be served by backend)
                  imageSrc = scanData.file_url;
                } else {
                  // Relative path without /, prepend /
                  imageSrc = `/${scanData.file_url}`;
                }
              }
              
              return (
                <div className="w-full">
                  <Image
                    src={imageSrc}
                    alt="Homework scan"
                    className="w-full"
                    style={{ maxWidth: "100%", height: "auto" }}
                    preview={{
                      mask: "View Full Size",
                    }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                  />
                </div>
              );
            })() : (
              <Text type="secondary">No image available</Text>
            )}
          </Card>

          {/* Right Column - Details */}
          <Card title="Scan Details">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="ID">{scanData.id}</Descriptions.Item>
              <Descriptions.Item label="Student ID">
                {scanData.student_id || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Student">
                {studentName}
                {scanData.student_id && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate(`/admin/students/${scanData.student_id}`)}
                  >
                    View Student
                  </Button>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Subject">
                <Tag color="blue">{scanData.detected_subject || "-"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Task Type">
                <Tag>{scanData.task_type || "-"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Grade">{grade}</Descriptions.Item>
              <Descriptions.Item label="Publisher">{scanData.publisher || "-"}</Descriptions.Item>
              <Descriptions.Item label="Created At">{formatDate(scanData.created_at)}</Descriptions.Item>
              <Descriptions.Item label="Processed At">
                {formatDate(scanData.processed_at)}
              </Descriptions.Item>
              {isCompleted && (
                <>
                  <Descriptions.Item label="Completed At">
                    {formatDate(scanData.completed_at)}
                  </Descriptions.Item>
                  {scanData.completion_photo_url && (
                    <Descriptions.Item label="Completion Photo">
                      <Image
                        src={
                          scanData.completion_photo_url.startsWith("http")
                            ? scanData.completion_photo_url
                            : `/api${scanData.completion_photo_url}`
                        }
                        alt="Completion photo"
                        width={200}
                        preview={{
                          mask: "View Full Size",
                        }}
                      />
                    </Descriptions.Item>
                  )}
                </>
              )}
            </Descriptions>
          </Card>
        </div>

        {/* Raw Text */}
        {scanData.raw_text && (
          <Card title="Extracted Text">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>{scanData.raw_text}</Paragraph>
          </Card>
        )}

        {/* Notes */}
        {scanData.notes && (
          <Card title="Notes">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>{scanData.notes}</Paragraph>
          </Card>
        )}

        {/* Tags */}
        {scanData.tags && (
          <Card title="Tags">
            <Space wrap>
              {scanData.tags.split(",").map((tag, idx) => (
                <Tag key={idx}>{tag.trim()}</Tag>
              ))}
            </Space>
          </Card>
        )}

        {/* API Usage */}
        {(scanData.api_tokens_used || scanData.api_cost_usd) && (
          <Card title="API Usage">
            <Descriptions column={2} bordered>
              {scanData.api_tokens_used && (
                <Descriptions.Item label="Tokens Used">{scanData.api_tokens_used}</Descriptions.Item>
              )}
              {scanData.api_cost_usd && (
                <Descriptions.Item label="Cost (USD)">
                  ${parseFloat(scanData.api_cost_usd).toFixed(6)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}
      </Space>
    </div>
  );
}

