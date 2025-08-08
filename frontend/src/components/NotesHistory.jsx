// src/components/NotesHistory.jsx
import { List, Typography } from "antd";
const { Text } = Typography;

export default function NotesHistory({ notes = [] }) {
  return (
    <List
      header={<b>Notes History</b>}
      bordered
      dataSource={notes}
      renderItem={(note) => (
        <List.Item>
          <Text strong>{note.author}</Text> — <Text type="secondary">{note.timestamp}</Text>
          <br />
          {note.content}
        </List.Item>
      )}
    />
  );
}
