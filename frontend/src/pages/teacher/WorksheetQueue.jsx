import { useEffect, useState } from "react";
import { Card, Button, List, Tag, Empty, Row, Col, Typography } from "antd";

const { Text } = Typography;

export default function WorksheetQueue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async ()=>{
      const r = await fetch("/api/worksheets/pending");
      setItems(r.ok ? await r.json() : []);
    })();
  }, []);

  const approve = async (id, patch = {}) => {
    await fetch(`/api/worksheets/${id}/approve`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(patch),
    });
    setItems((arr)=>arr.filter(x=>x.id!==id));
  };

  return (
    <div className="px-3 md:px-6 py-4 mx-auto w-full max-w-6xl">
      <Card className="rounded-2xl">
        <List
          locale={{ emptyText: <Empty description="No pending worksheets" /> }}
          dataSource={items}
          renderItem={(it)=>(
            <List.Item className="!px-0">
              <Row gutter={[16, 8]} className="w-full">
                <Col xs={24} md={16}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>{it.title || "Untitled worksheet"}</b>
                    <div className="flex flex-wrap gap-2">
                      {it.tags?.subject && <Tag>{it.tags.subject}</Tag>}
                      {it.tags?.grade && <Tag>{it.tags.grade}</Tag>}
                      <Tag color={it.duplicateOf ? "red" : "green"}>
                        {it.duplicateOf ? "Duplicate" : "New"}
                      </Tag>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    {it.editor || "Unknown editor"} • {it.publisher || "Unknown publisher"} • sig: {it.signature?.slice(0,16)}
                  </div>
                </Col>
                <Col xs={24} md={8} className="md:text-right">
                  <Space wrap>
                    <Button type="primary" className="rounded-xl" onClick={()=>approve(it.id)}>Approve</Button>
                    <Button className="rounded-xl" onClick={()=>approve(it.id, { status:"fix" })}>Needs fix</Button>
                    <Button danger className="rounded-xl" onClick={()=>approve(it.id, { status:"reject" })}>Reject</Button>
                  </Space>
                </Col>
                <Col span={24}>
                  <pre className="bg-neutral-50 p-2 rounded mt-2 max-h-40 overflow-auto">{it.text}</pre>
                </Col>
              </Row>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
