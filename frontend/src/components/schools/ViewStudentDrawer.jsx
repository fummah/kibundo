import { useEffect, useState } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Avatar,
  Divider,
  Timeline,
  Typography,
  Spin,
  Input,
  Button,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import api from "../../api/axios";
import dayjs from "dayjs";
import { useAuthContext } from "../../context/AuthContext";

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function ViewStudentDrawer({ open, onClose, student }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthContext();

  const fetchNotes = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/students/${student.id}/notes`);
      setNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      message.warning("Note cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/students/${student.id}/notes`, {
        note: newNote,
        author: user?.name || "Admin",
      });
      message.success("Note added.");
      setNewNote("");
      fetchNotes();
    } catch (err) {
      console.error("Failed to add note", err);
      message.error("Could not save note.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open && student?.id) {
      fetchNotes();
    }
  }, [open, student]);

  if (!student) return null;

  return (
    <Drawer
      title="👁️ View Student Details"
      onClose={onClose}
      open={open}
      width={window.innerWidth < 768 ? "100%" : 480}
      styles={{ body: {{ paddingBottom: 24 }}
    >
      {/* Avatar Section */}
      <div className="flex items-center mb-4">
        <Avatar
          size={64}
          icon={<UserOutlined />}
          src={student.avatar || null}
          className="mr-4"
        />
        <div>
          <h3 className="text-lg font-semibold">{student.name || "N/A"}</h3>
          <p className="text-sm text-gray-500">
            <MailOutlined className="mr-1" />
            {student.email || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            <PhoneOutlined className="mr-1" />
            {student.phone || "N/A"}
          </p>
        </div>
      </div>

      <Divider />

      <Descriptions column={1} bordered size="middle">
        <Descriptions.Item label="Grade">
          {student.grade || student.class_name || "N/A"}
        </Descriptions.Item>

        <Descriptions.Item label="Subjects">
          {Array.isArray(student.subjects) && student.subjects.length > 0 ? (
            student.subjects.map((subj, idx) => (
              <Tag key={idx} color="blue">
                {subj}
              </Tag>
            ))
          ) : (
            <span className="text-gray-400">No subjects</span>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Status">
          <Tag color={
            student.status === "Active" ? "green"
              : student.status === "Inactive" ? "red"
              : student.status === "Pending" ? "orange"
              : student.status === "Approved" ? "blue"
              : student.status === "Rejected" ? "volcano"
              : "default"
          }>
            {student.status || "Unknown"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* 📝 Notes Section */}
      <Divider />
      <Title level={5}>📝 Notes History</Title>
      <Spin spinning={loading}>
        {notes.length > 0 ? (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={index}>
                <Text>{note.note}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  — {note.author || "Admin"}, {dayjs(note.timestamp).format("DD MMM YYYY HH:mm")}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Text type="secondary">No notes available.</Text>
        )}
      </Spin>

      <Divider />
      <Title level={5}>✍️ Add Note</Title>
      <TextArea
        rows={3}
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder="Write a note about this student..."
        maxLength={500}
        style={{ marginBottom: 12 }}
      />
      <Button
        type="primary"
        block
        loading={submitting}
        onClick={handleAddNote}
      >
        Submit Note
      </Button>
    </Drawer>
  );
}
