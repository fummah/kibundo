import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Button, List, Tag, Empty, Row, Col, Typography } from "antd";

const { Text } = Typography;

export default function WorksheetQueue() {
  const { t } = useTranslation();
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
          locale={{ emptyText: <Empty description={t("teacher.noPendingWorksheets", "Keine ausstehenden Arbeitsblätter")} /> }}
          dataSource={items}
          renderItem={(it)=>(
            <List.Item className="!px-0">
              <Row gutter={[16, 8]} className="w-full">
                <Col xs={24} md={16}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>{it.title || t("teacher.untitledWorksheet", "Unbenanntes Arbeitsblatt")}</b>
                    <div className="flex flex-wrap gap-2">
                      {it.tags?.subject && <Tag>{it.tags.subject}</Tag>}
                      {it.tags?.grade && <Tag>{it.tags.grade}</Tag>}
                      <Tag color={it.duplicateOf ? "red" : "green"}>
                        {it.duplicateOf ? t("teacher.duplicate", "Duplikat") : t("teacher.new", "Neu")}
                      </Tag>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    {it.editor || t("teacher.unknownEditor", "Unbekannter Editor")} • {it.publisher || t("teacher.unknownPublisher", "Unbekannter Herausgeber")} • sig: {it.signature?.slice(0,16)}
                  </div>
                </Col>
                <Col xs={24} md={8} className="md:text-right">
                  <Space wrap>
                    <Button type="primary" className="rounded-xl" onClick={()=>approve(it.id)}>{t("teacher.approve", "Genehmigen")}</Button>
                    <Button className="rounded-xl" onClick={()=>approve(it.id, { status:"fix" })}>{t("teacher.needsFix", "Korrektur erforderlich")}</Button>
                    <Button danger className="rounded-xl" onClick={()=>approve(it.id, { status:"reject" })}>{t("teacher.reject", "Ablehnen")}</Button>
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
