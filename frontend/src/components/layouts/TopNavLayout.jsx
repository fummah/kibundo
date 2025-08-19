import { Layout, Menu, Avatar, Space, Typography } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import Logo from "@/assets/logo.png";

const { Header, Content } = Layout;
const { Text } = Typography;

const items = [
  { key: "/dashboard", label: "Dashboard" },
  { key: "/customers", label: "Customers" },
  { key: "/products", label: "Products" },
  { key: "/orders", label: "Orders" },
  { key: "/subscriptions", label: "Subscriptions" },
  { key: "/discounts", label: "Discounts" },
];

export default function TopNavLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selected = "/" + (pathname.split("/")[1] || "dashboard");

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white border-b">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between h-16 px-3">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="logo" className="w-6 h-6" />
            <Text strong className="!mb-0">Support Central</Text>
          </div>

          <Menu
            mode="horizontal"
            selectedKeys={[selected]}
            items={items}
            onClick={({ key }) => navigate(key)}
            className="flex-1 !border-none justify-center"
          />

          <Space size="large">
            <Bell className="w-5 h-5 text-gray-500" />
            <Avatar size="small" className="bg-gray-100">
              <User className="w-4 h-4 text-gray-600" />
            </Avatar>
          </Space>
        </div>
      </Header>

      <Content>
        <div className="max-w-[1200px] mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
