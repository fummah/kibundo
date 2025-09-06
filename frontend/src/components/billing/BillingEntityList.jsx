import React, { useMemo, useState } from "react";
import { Card, Table, Space, Button, Tooltip, Typography } from "antd";
import { SettingOutlined, ReloadOutlined } from "@ant-design/icons";
import ColumnPickerModal from "@/components/common/ColumnPickerModal";
import useLocalStorage from "@/hooks/useLocalStorage";

const { Text } = Typography;

/**
 * BillingEntityList
 * Reusable list wrapper (AntD Table) for billing pages.
 *
 * New:
 *  - onRowClick(record, event): open detail drawer on row click
 *  - ignoreRowClickSelectors: extra CSS selectors to ignore (besides built-ins)
 *
 * Props:
 *  - title?: string | node
 *  - data: any[]
 *  - loading?: boolean
 *  - rowKey?: string | (record)=>any            // default r => r.id
 *  - columnsMap: Record<string, Column>
 *  - storageKey: string
 *  - defaultVisible: string[]
 *  - actionsRender?: (record)=>node              // adds trailing Actions column
 *  - actionsWidth?: number                       // default 100
 *  - actionsFixed?: 'left'|'right'               // default 'right'
 *  - onRefresh?: ()=>void
 *  - selection?: { selectedRowKeys: any[], onChange: (keys)=>void }
 *  - toolbarLeft?: node
 *  - toolbarRight?: node
 *  - pageSize?: number                           // default 20
 *  - scrollX?: number                            // default 1000
 *  - size?: 'small'|'middle'|'large'             // default 'middle'
 *  - tableProps?: object                         // forwarded to <Table />
 *  - showColumnPicker?: boolean                  // default true
 *  - headerNote?: node
 *  - onRowClick?: (record, event)=>void          // 🚀 open detail on row click
 *  - ignoreRowClickSelectors?: string[]          // extra selectors to ignore
 */
export default function BillingEntityList({
  title,
  data = [],
  loading = false,
  rowKey = (r) => r?.id,
  columnsMap,
  storageKey,
  defaultVisible = [],
  actionsRender,
  actionsWidth = 100,
  actionsFixed = "right",
  onRefresh,
  selection,
  toolbarLeft,
  toolbarRight,
  pageSize = 20,
  scrollX = 1000,
  size = "middle",
  tableProps = {},
  showColumnPicker = true,
  headerNote,
  onRowClick,                         // NEW
  ignoreRowClickSelectors = [],       // NEW
}) {
  const [visibleCols, setVisibleCols] = useLocalStorage(storageKey, defaultVisible);
  const [colsOpen, setColsOpen] = useState(false);

  const columns = useMemo(() => {
    const base = (visibleCols || []).map((k) => columnsMap[k]).filter(Boolean);
    if (actionsRender) {
      base.push({
        title: "Actions",
        key: "actions",
        className: "billing-actions-cell", // mark actions cell to ignore row click
        fixed: actionsFixed,
        width: actionsWidth,
        render: (_, r) => actionsRender(r),
      });
    }
    return base;
  }, [visibleCols, columnsMap, actionsRender, actionsFixed, actionsWidth]);

  const rowSelection = selection
    ? { selectedRowKeys: selection.selectedRowKeys || [], onChange: selection.onChange }
    : undefined;

  // --- Row click support ---
  const DEFAULT_IGNORE =
    [
      "a",
      "button",
      "[role='button']",
      "input",
      "textarea",
      "select",
      ".ant-btn",
      ".ant-dropdown",
      ".ant-dropdown-menu",
      ".ant-select",
      ".ant-select-dropdown",
      ".ant-picker",
      ".ant-switch",
      ".ant-checkbox",
      ".ant-radio",
      ".ant-pagination",
      ".billing-actions-cell",
      "[data-no-rowclick]",
    ].concat(ignoreRowClickSelectors || []);

  const shouldIgnoreRowClick = (evt) => {
    if (!evt?.target || !evt.target.closest) return false;
    return !!evt.target.closest(DEFAULT_IGNORE.join(","));
  };

  // Merge rowClassName with clickable style
  const externalRowClassName = tableProps?.rowClassName;
  const mergedRowClassName = (record, index) => {
    const extra =
      typeof externalRowClassName === "function"
        ? externalRowClassName(record, index)
        : (externalRowClassName || "");
    const clickable = onRowClick ? "cursor-pointer" : "";
    return [extra, clickable].filter(Boolean).join(" ");
  };

  return (
    <Card hoverable variant="outlined" styles={{ body: { padding: 0 } }}>
      {/* Header */}
      <div className="flex flex-col gap-3 p-3 md:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {title ? (
              typeof title === "string" ? (
                <h2 className="text-lg sm:text-xl font-semibold m-0">{title}</h2>
              ) : (
                title
              )
            ) : null}
            {headerNote ? <Text type="secondary" className="!ml-1">{headerNote}</Text> : null}
          </div>

          <Space wrap>
            {toolbarRight}
            {showColumnPicker && (
              <Tooltip title="Show / Hide columns">
                <Button icon={<SettingOutlined />} onClick={() => setColsOpen(true)} />
              </Tooltip>
            )}
            {onRefresh && (
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
            )}
          </Space>
        </div>

        {toolbarLeft ? <div className="flex items-center gap-2">{toolbarLeft}</div> : null}
      </div>

      {/* Table */}
      <Table
        loading={loading}
        dataSource={data}
        rowKey={rowKey}
        columns={columns}
        size={size}
        pagination={{ pageSize, showSizeChanger: false }}
        scroll={{ x: scrollX }}
        rowSelection={rowSelection}
        rowClassName={mergedRowClassName}
        onRow={(record) => ({
          onClick: (evt) => {
            if (!onRowClick) return;
            if (shouldIgnoreRowClick(evt)) return;
            onRowClick(record, evt);
          },
        })}
        {...tableProps}
      />

      {/* Column picker */}
      {showColumnPicker && (
        <ColumnPickerModal
          open={colsOpen}
          onClose={() => setColsOpen(false)}
          columnsMap={columnsMap}
          value={visibleCols}
          onChange={setVisibleCols}
          defaultVisible={defaultVisible}
        />
      )}
    </Card>
  );
}
