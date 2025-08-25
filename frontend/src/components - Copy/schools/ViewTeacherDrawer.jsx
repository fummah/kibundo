import { useEffect, useState } from "react";
import { Drawer, Descriptions, Tag } from "antd";

export default function ViewTeacherDrawer({ open, onClose, teacher }) {
  const [drawerWidth, setDrawerWidth] = useState(480);

  useEffect(() => {
    const handleResize = () => {
      setDrawerWidth(window.innerWidth < 768 ? "100%" : 480);
    };
    handleResize(); // Set on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!teacher) return null;

  const getTeacherName = () => {
    if (teacher.firstName || teacher.lastName) {
      return `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim();
    }
    return teacher.name ?? "-";
  };

  const getSubjects = () => {
    if (!teacher.subject || teacher.subject.length === 0) return "-";
    return teacher.subject.map((s, i) => {
      const label = typeof s === "string" ? s : s.name;
      return (
        <Tag key={i} color="blue">
          {label}
        </Tag>
      );
    });
  };

  return (
    <Drawer
      title="👁️ View Teacher"
      onClose={onClose}
      open={open}
      width={drawerWidth}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">{getTeacherName()}</Descriptions.Item>
        <Descriptions.Item label="Email">{teacher.email ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Phone">{teacher.phone ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Grade">{teacher.grade ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Subjects">{getSubjects()}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={teacher.status === "Active" ? "green" : "red"}>
            {teacher.status ?? "Unknown"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}
