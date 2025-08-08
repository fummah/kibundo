import { Drawer, Button, Space, Divider, Popconfirm, message } from "antd";
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";

export const ViewEnrolmentDrawer = ({
  open,
  onClose,
  record,
  children,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const handleApprove = () => {
    onStatusChange && onStatusChange(record, "approved");
    message.success("Application approved");
    onClose();
  };

  const handleReject = () => {
    onStatusChange && onStatusChange(record, "rejected");
    message.error("Application rejected");
    onClose();
  };

  const handleEdit = () => {
    onEdit && onEdit(record);
    onClose();
  };

  const handleDelete = () => {
    onDelete && onDelete(record);
    onClose();
  };

  return (
    <Drawer
      title={`👁️ View ${record?.firstName || ""} ${record?.lastName || ""}`}
      placement="right"
      onClose={onClose}
      open={open}
      width={window.innerWidth < 768 ? "100%" : 480}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {children}
        <Divider />
        <Space wrap>
          <Button icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>

          <Popconfirm
            title="Are you sure to delete this record?"
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
          >
            <Button danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>

          <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove}>Approve</Button>
          <Button type="default" icon={<CloseOutlined />} onClick={handleReject}>Reject</Button>
        </Space>
      </Space>
    </Drawer>
  );
};

export default ViewEnrolmentDrawer;
