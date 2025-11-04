// src/components/common/ConfirmDrawer.jsx
import React from "react";
import { Drawer, Button, Space, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";

/**
 * ConfirmDrawer
 * - If showCloseButton is true, the footer Cancel button is hidden automatically.
 * - Use topOffset to keep the drawer under a fixed header.
 */
export default function ConfirmDrawer({
  open,
  title,
  description,
  children,
  onConfirm,
  onClose,
  loading = false,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = true,
  width = 420,
  placement = "right",
  destroyOnHidden = true,
  closable = true,
  showCloseButton = false,
  closeText = "Close",
  topOffset = 0, // 👈 height of your fixed header in px (e.g., 64)
}) {
  const showCancel = Boolean(cancelText) && !showCloseButton;

  return (
    <Drawer
      title={title}
      placement={placement}
      width={width}
      open={open}
      destroyOnHidden={destroyOnHidden}
      onClose={onClose}
      closable={closable}
      // 👇 keep panel and mask below the header
      style={{ top: topOffset }}
      styles={{
        mask: { top: topOffset }
      }}
      extra={
        showCloseButton ? (
          <Button icon={<CloseOutlined />} onClick={onClose}>
            {closeText}
          </Button>
        ) : null
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {showCancel && <Button onClick={onClose}>{cancelText}</Button>}
          <Button danger={danger} loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </Space>
      }
    >
      {children ? (
        children
      ) : description ? (
        <Typography.Paragraph>{description}</Typography.Paragraph>
      ) : null}
    </Drawer>
  );
}
