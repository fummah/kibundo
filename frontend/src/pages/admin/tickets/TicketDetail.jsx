import React from "react";
import { Tag, Descriptions, Card, Space, Button } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios";
import PageHeader from "@/components/PageHeader.jsx";

const dash = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = (typeof d === "string" || typeof d === "number") ? new Date(d) : d;
  if (!dt || isNaN(dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await api.get(`/tickets/${id}`);
      return res?.data?.data ?? res?.data ?? {};
    },
  });

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title="Ticket Detail" extra={<Button onClick={() => navigate(-1)}>Back</Button>} />
      <div className="p-3 md:p-4">
        <Card>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{dash(data?.id)}</Descriptions.Item>
            <Descriptions.Item label="Subject">{dash(data?.subject)}</Descriptions.Item>
            <Descriptions.Item label="Priority">
              <Tag>{dash(data?.priority)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={data?.status === "open" ? "geekblue" : data?.status === "pending" ? "gold" : data?.status === "closed" ? "green" : ""}>
                {dash(data?.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tags">
              {Array.isArray(data?.tags) && data.tags.length
                ? data.tags.map((t) => <Tag key={String(t)}>{dash(t)}</Tag>)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">{fmtDate(data?.updated_at)}</Descriptions.Item>
            <Descriptions.Item label="Message">{dash(data?.body)}</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            <Button onClick={() => navigate(`/admin/tickets/${id}/edit`)}>Edit</Button>
          </Space>
        </Card>
      </div>
    </div>
  );
}
