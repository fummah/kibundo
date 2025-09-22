import { Tag, Button } from 'antd';
import i18next from 'i18next';

const dash = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : v);

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = (typeof d === "string" || typeof d === "number") ? new Date(d) : d;
  if (!dt || isNaN(dt)) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const statusChip = (s) => {
  const norm = String(s || '').toLowerCase();
  const baseCls = '!m-0 !px-3 !py-[2px] !rounded';
  if (!norm) return <Tag className={baseCls}>-</Tag>;

  // Treat pending-like states as Active
  if (norm === 'active' || norm === 'pending' || norm === 'invited' || norm === 'invite_sent') {
    return <Tag color="green" className={baseCls}>{i18next.t('entityList.status.active')}</Tag>;
  }
  if (norm === 'suspended') return <Tag color="orange" className={baseCls}>{i18next.t('entityList.status.suspended')}</Tag>;
  if (norm === 'disabled' || norm === 'blocked' || norm === 'inactive') return <Tag color="red" className={baseCls}>{i18next.t('entityList.status.blocked')}</Tag>;

  // Fallback: show the actual status text with a neutral/blue tag
  return <Tag color="blue" className={baseCls}>{s}</Tag>;
};

export const columnFactories = {
  status: (dataIndex = "status") => ({
    title: "Status",
    dataIndex,
    key: "status",
    width: 120,
    render: statusChip,
  }),

  idLink: (title, routeBase, idField = "id", navigateFn) => ({
    title,
    dataIndex: idField,
    key: "id",
    width: 90,
    sorter: (a, b) => (a[idField] || 0) - (b[idField] || 0),
    render: (v, r) => (
      <Button
        type="link"
        className="!px-0"
        onClick={() => navigateFn(r[idField])}
      >
        {v}
      </Button>
    ),
  }),

  nameLink: (title, routeBase, idField = "id", nameField = "name", navigateFn) => ({
    title,
    dataIndex: nameField,
    key: "name",
    sorter: (a, b) => String(a[nameField] || "").localeCompare(String(b[nameField] || "")),
    render: (v, r) => (
      <Button
        type="link"
        className="!px-0"
        onClick={() => navigateFn(r[idField])}
      >
        {v}
      </Button>
    ),
  }),

  text: (title, dataIndex, key) => ({
    title,
    dataIndex,
    key: key || dataIndex,
    render: (v) => dash(v),
    sorter: (a, b) => String(a[dataIndex] || "").localeCompare(String(b[dataIndex] || "")),
  }),

  email: (dataIndex = "email") => ({
    title: "Email",
    dataIndex,
    key: "email",
    render: (v) => (v ? <a href={`mailto:${v}`}>{v}</a> : "-"),
    sorter: (a, b) => String(a[dataIndex] || "").localeCompare(String(b[dataIndex] || "")),
  }),

  date: (title, dataIndex, key) => ({
    title,
    dataIndex,
    key: key || dataIndex,
    width: 130,
    render: fmtDate,
    sorter: (a, b) => {
      const ad = new Date(a[dataIndex] || 0);
      const bd = new Date(b[dataIndex] || 0);
      return ad - bd;
    },
  }),
};
