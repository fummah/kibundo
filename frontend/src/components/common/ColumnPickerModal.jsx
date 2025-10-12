import React from "react";
import { Modal, Button, Checkbox, Divider, Space, Typography } from "antd";

export default function ColumnPickerModal({
  open,
  onClose,
  columnsMap,      // { key: { title, ... }, ... }
  value,           // visible column keys (array)
  onChange,        // (nextKeys: string[]) => void
  defaultVisible = [],
  okText = "Done",
  title = "Show / Hide columns",
  note = "“Actions” is always visible.",
}) {
  const keys = Object.keys(columnsMap || {});
  const options = keys.map((k) => ({
    value: k,
    label: columnsMap[k]?.title || k,
  }));

  const uniq = (arr) => Array.from(new Set(arr || []));

  return (
    <Modal title={title} open={open} onCancel={onClose} onOk={onClose} okText={okText} destroyOnHidden={false}>
      <div className="mb-2">
        <Space wrap>
          <Button onClick={() => onChange(keys)}>Select all</Button>
          <Button onClick={() => onChange(defaultVisible.slice())}>Reset</Button>
        </Space>
      </div>

      <Checkbox.Group
        value={uniq(value)}
        onChange={(vals) => onChange(uniq(vals))}
        className="grid grid-cols-1 sm:grid-cols-2 gap-y-2"
        options={options}
      />

      <Divider />
      <Typography.Text type="secondary">{note}</Typography.Text>
    </Modal>
  );
}
