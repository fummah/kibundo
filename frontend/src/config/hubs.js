// src/config/hubs.js
import {
  HomeOutlined, TeamOutlined, ShoppingOutlined, ProfileOutlined,
  ReconciliationOutlined, TagsOutlined, PieChartOutlined, QuestionCircleOutlined,
  AppstoreOutlined, ReadOutlined, UsergroupAddOutlined, FileTextOutlined
} from "@ant-design/icons";

export const HUB_MENUS = {
  support: [
    { key: "dashboard",    label: "Dashboard",     to: "/admin/hub/support/dashboard",    icon: <HomeOutlined /> },
    { key: "customers",    label: "Customers",     to: "/admin/hub/support/customers",    icon: <TeamOutlined /> },
    { key: "products",     label: "Products",      to: "/admin/hub/support/products",     icon: <ShoppingOutlined /> },
    { key: "orders",       label: "Orders",        to: "/admin/hub/support/orders",       icon: <ProfileOutlined /> },
    { key: "subscriptions",label: "Subscriptions", to: "/admin/hub/support/subscriptions",icon: <ReconciliationOutlined /> },
    { key: "discounts",    label: "Discounts",     to: "/admin/hub/support/discounts",    icon: <TagsOutlined /> },
    { key: "analytics",    label: "Analytics",     to: "/admin/hub/support/analytics",    icon: <PieChartOutlined /> },
    { key: "help",         label: "Help",          to: "/admin/hub/support/help",         icon: <QuestionCircleOutlined /> },
  ],
  edu: [
    { key: "dashboard", label: "Dashboard",  to: "/admin/hub/edu/dashboard",  icon: <HomeOutlined /> },
    { key: "students",  label: "Students",   to: "/admin/hub/edu/students",   icon: <UsergroupAddOutlined /> },
    { key: "classes",   label: "Classes",    to: "/admin/hub/edu/classes",    icon: <AppstoreOutlined /> },
    { key: "content",   label: "Content",    to: "/admin/hub/edu/content",    icon: <ReadOutlined /> },
    { key: "community", label: "Community",  to: "/admin/hub/edu/community",  icon: <TeamOutlined /> },
    { key: "analytics", label: "Analytics",  to: "/admin/hub/edu/analytics",  icon: <PieChartOutlined /> },
    { key: "blog",      label: "Blog / News",to: "/admin/hub/edu/blog",       icon: <FileTextOutlined /> },
    { key: "reports",   label: "Reports",    to: "/admin/hub/edu/reports",    icon: <FileTextOutlined /> },
  ],
};

export function getHubFromPath(pathname = "") {
  const m = pathname.match(/^\/admin\/hub\/(support|edu)\b/i);
  return m ? m[1] : null;
}
