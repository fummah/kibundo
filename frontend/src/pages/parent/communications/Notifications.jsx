// src/pages/parent/communications/Notifications.jsx
import { useMemo, useState } from "react";
import { Card, List, Avatar, Tag, Switch, Space, Button, Segmented, message, Empty } from "antd";
import { BellOutlined, MailOutlined, CheckCircleTwoTone, NotificationTwoTone, MessageTwoTone, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import GradientShell from "@/components/GradientShell";
import BottomTabBarDE from "@/components/BottomTabBarDE";

dayjs.extend(relativeTime);

const DUMMY = [
  { id: 1, type: "system", title: "Welcome to Kibundo!", text: "Your account is set up.", at: dayjs().subtract(2, "hour").toISOString(), read: false },
  { id: 2, type: "activity", title: "New scan available", text: "Math worksheet processed.", at: dayjs().subtract(1, "day").toISOString(), read: false },
  { id: 3, type: "newsletter", title: "Back-to-School Tips", text: "Routines that stick.", at: dayjs().subtract(5, "day").toISOString(), read: true },
];

const TYPE_TAG = {
  system: <Tag color="blue" bordered={false}>System</Tag>,
  activity: <Tag color="green" bordered={false}>Activity</Tag>,
  newsletter: <Tag color="purple" bordered={false}>Newsletter</Tag>,
};

export default function Notifications() {
  const [items, setItems] = useState(DUMMY);
  const [view, setView] = useState("all"); // all | unread

  const filtered = useMemo(() => {
    return view === "unread" ? items.filter(i => !i.read) : items;
  }, [view, items]);

  const markAllRead = () => {
    setItems(prev => prev.map(i => ({ ...i, read: true })));
    message.success("All notifications marked as read");
  };

  const toggleRead = (id) => {
    setItems(prev => prev.map(i => i.id === id ? ({ ...i, read: !i.read }) : i));
  };

  // Preferences (purely local)
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  const [prefActivity, setPrefActivity] = useState(true);

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold m-0">Notifications</h1>
            <p className="text-gray-600 m-0">Stay up to date with system alerts and activity.</p>
          </div>
          <Space wrap>
            <Segmented
              value={view}
              onChange={setView}
              options={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => message.success("Refreshed")}>Refresh</Button>
            <Button type="primary" onClick={markAllRead}>Mark all read</Button>
          </Space>
        </div>

        {/* Preferences */}
        <Card className="rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><MailOutlined /> Email notifications</span>
              <Switch checked={prefEmail} onChange={setPrefEmail} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><BellOutlined /> Push notifications</span>
              <Switch checked={prefPush} onChange={setPrefPush} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><NotificationTwoTone twoToneColor="#52c41a" /> Activity alerts</span>
              <Switch checked={prefActivity} onChange={setPrefActivity} />
            </div>
          </div>
        </Card>

        {/* List */}
        <Card className="rounded-2xl shadow-sm">
          {filtered.length === 0 ? (
            <Empty description="No notifications here." />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filtered}
              renderItem={(n) => (
                <List.Item
                  actions={[
                    <Button key="toggle" type="link" onClick={() => toggleRead(n.id)}>
                      {n.read ? "Mark unread" : "Mark read"}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar size={40} icon={n.read ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <MessageTwoTone />} />
                    }
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{n.title}</span>
                        {TYPE_TAG[n.type]}
                        <span className="text-xs text-gray-500">· {dayjs(n.at).fromNow()}</span>
                      </div>
                    }
                    description={<span className="text-gray-700">{n.text}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabBarDE />
      </div>
    </GradientShell>
  );
}
