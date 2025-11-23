import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Row,
  Col,
  Divider,
  message,
  Modal,
  Grid,
  Tabs,
  Tag,
  Avatar,
  Space,
} from "antd";
import {
  SaveOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  GiftOutlined,
  SolutionOutlined,
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SettingOutlined,
  HomeOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
import PlainBackground from "@/components/layouts/PlainBackground";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";

const { useBreakpoint } = Grid;

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuthContext();
  const [form] = Form.useForm();
  const [twoFA, setTwoFA] = useState(Boolean(user?.mfa_enabled));
  const navigate = useNavigate();
  useBreakpoint(); // keep breakpoint hook (future responsive tweaks)
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [notificationPrefs, setNotificationPrefs] = useState({
    weeklyDigest: true,
    homeworkUpdates: true,
    marketingEmails: false,
    productAnnouncements: true,
  });

  const formatDEPhone = useCallback((raw = "") => {
    const digits = String(raw).replace(/[^\d]/g, "");
    let rest = digits;
    if (rest.startsWith("49")) rest = rest.slice(2);
    if (rest.startsWith("0")) rest = rest.replace(/^0+/, "");
    return `+49 ${rest}`.trim();
  }, []);

  // Fetch current user data and states
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingStates(true);
        const userRes = await api.get("/current-user");
        const userData = userRes?.data?.user || userRes?.data || user;
        setCurrentUser(userData);

        const statesRes = await api.get("/states");
        const statesData = Array.isArray(statesRes.data) 
          ? statesRes.data 
          : statesRes.data?.data || [];
        
        const processedStates = statesData.map((state) => {
          if (state && typeof state === "object") {
            const value = state.state_name || state.name || state.id;
            const label = state.state_name || state.name || state.id;
            return { 
              value: String(value), 
              label: String(label),
            };
          }
          return { value: String(state), label: String(state) };
        });
        setStates(processedStates);
      } catch (error) {
        console.error("Error fetching user data or states:", error);
        message.error("Failed to load user information");
      } finally {
        setLoadingStates(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, user]);

  const initialValues = useMemo(() => {
    const userData = currentUser || user;
    return {
      first_name: userData?.first_name ?? userData?.name?.split(" ")?.[0] ?? "",
      last_name:
        userData?.last_name ??
        (userData?.name ? userData.name.split(" ").slice(1).join(" ") : "") ??
        "",
      email: userData?.email ?? "",
      phone: userData?.contact_number ? formatDEPhone(userData.contact_number) : "+49 ",
      state: userData?.state ?? "",
      locale: userData?.locale ?? "de-DE",
    };
  }, [currentUser, user, formatDEPhone]);

  useEffect(() => {
    if (currentUser || user) {
      form.setFieldsValue(initialValues);
      setTwoFA(Boolean((currentUser || user)?.mfa_enabled));
    }
  }, [initialValues, form, currentUser, user]);

  const save = async () => {
    try {
      const vals = await form.validateFields();
      const userData = currentUser || user;
      
      if (!userData?.id) {
        message.error("User ID not found. Please refresh the page.");
        return;
      }

      let contact_number = vals.phone;
      if (contact_number) {
        contact_number = contact_number.replace(/\+49\s*/g, "").replace(/\s+/g, "").replace(/^0+/, "");
        if (contact_number) {
          contact_number = `+49${contact_number}`;
        }
      }

      const updatePayload = {
        first_name: vals.first_name,
        last_name: vals.last_name,
        email: vals.email,
        contact_number: contact_number || null,
        state: vals.state || null,
        locale: vals.locale || null,
      };

      if (vals.password && vals.password.trim()) {
        updatePayload.plain_pass = vals.password;
      }

      const response = await api.put(`/users/${userData.id}`, updatePayload);
      
      if (response.data?.user) {
        setCurrentUser(response.data.user);
        form.setFieldsValue({
          first_name: response.data.user.first_name,
          last_name: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.contact_number
            ? formatDEPhone(response.data.user.contact_number)
            : "+49 ",
          state: response.data.user.state,
          locale: response.data.user.locale || "de-DE",
        });
      }

      message.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      message.error(
        error?.response?.data?.message || 
        error?.message || 
        "Failed to save settings. Please try again."
      );
    }
  };

  const handleSwitchProfile = () => {
    navigate("/parent/account", { replace: true });
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: "Log out?",
      okText: "Log out",
      okButtonProps: { danger: true, icon: <LogoutOutlined /> },
      onOk: async () => {
        try {
          await logout?.();
          // Navigate to signin after logout
          setTimeout(() => {
            navigate("/signin", { replace: true });
          }, 100);
        } catch {
          navigate("/signin", { replace: true });
        }
      },
    });
  };

  const openBilling = () => navigate("/parent/billing");
  const goOverview = (e) => {
    e?.stopPropagation();
    navigate("/parent/billing/overview");
  };
  const goSubscription = (e) => {
    e?.stopPropagation();
    navigate("/parent/billing/subscription");
  };
  const goInvoices = (e) => {
    e?.stopPropagation();
    navigate("/parent/billing/invoices");
  };
  const goCoupons = (e) => {
    e?.stopPropagation();
    navigate("/parent/billing/coupons");
  };

  return (
    <SettingsContent
      form={form}
      isAuthenticated={isAuthenticated}
      twoFA={twoFA}
      setTwoFA={setTwoFA}
      confirmLogout={confirmLogout}
      handleSwitchProfile={handleSwitchProfile}
      save={save}
      openBilling={openBilling}
      goOverview={goOverview}
      goSubscription={goSubscription}
      goInvoices={goInvoices}
      goCoupons={goCoupons}
      navigate={navigate}
      states={states}
      loadingStates={loadingStates}
      currentUser={currentUser || user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notificationPrefs={notificationPrefs}
      setNotificationPrefs={setNotificationPrefs}
    />
  );
}

function SettingsContent({
  form,
  confirmLogout,
  handleSwitchProfile,
  save,
  openBilling,
  goOverview,
  goSubscription,
  goInvoices,
  goCoupons,
  navigate,
  states,
  loadingStates,
  currentUser,
  activeTab,
  setActiveTab,
  notificationPrefs,
  setNotificationPrefs,
  twoFA,
  setTwoFA,
}) {
  const displayUser = currentUser || {};
  const displayName = useMemo(() => {
    const first = displayUser.first_name || "";
    const last = displayUser.last_name || "";
    const name = `${first} ${last}`.trim();
    if (name) return name;
    if (displayUser.name) return displayUser.name;
    if (displayUser.email) return displayUser.email.split("@")[0];
    return "Parent";
  }, [displayUser]);

  const initials = useMemo(() => {
  return (
      displayName
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "P"
    );
  }, [displayName]);

  const handleNotificationToggle = (key, value) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleNotificationSave = () => {
    message.success("Notification preferences saved.");
  };

  const renderProfileTab = (
    <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="First Name"
                name="first_name"
                rules={[{ required: true, message: "Please enter your first name" }]}
              >
                <Input className="rounded-xl" placeholder="First name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Last Name"
                name="last_name"
                rules={[{ required: true, message: "Please enter your last name" }]}
              >
                <Input className="rounded-xl" placeholder="Last name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: "email", message: "Please enter a valid email" }]}
              >
                <Input className="rounded-xl" placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Phone"
                name="phone"
                rules={[
                  {
                    validator: (_, v) => {
                      if (!v) return Promise.resolve();
                      const ok = /^(\+49|0)[1-9]\d{1,14}$/.test(v.replace(/\s+/g, ""));
                  return ok
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          "Please enter a valid German phone number (e.g., +49 30 12345678 or 030 12345678)"
                        )
                      );
                    },
                  },
                ]}
              >
                <Input
                  className="rounded-xl"
                  placeholder="+49 30 12345678"
                  onChange={(e) => {
                    const digits = e.target.value;
                    form.setFieldsValue({ phone: digits });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label="State (Bundesland)" 
                name="state"
                rules={[{ required: true, message: "Please select your state" }]}
              >
                <Select
                  placeholder="Select state"
                  options={states}
                  loading={loadingStates}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Locale" name="locale">
                <Select
                  options={[
                    { value: "de-DE", label: "Deutsch (Deutschland)" },
                    { value: "en-ZA", label: "English (South Africa)" },
                    { value: "en-GB", label: "English (UK)" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
    </div>
  );

  const renderSecurityTab = (
    <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="New Password"
                name="password"
                tooltip="Leave blank to keep your current password"
              >
            <Input.Password placeholder="Enter new password" />
              </Form.Item>
            </Col>
          </Row>
      <Card className="rounded-2xl border border-orange-100 bg-orange-50/70" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-6">
          <div>
            <h3 className="font-semibold text-orange-800 m-0">Two-factor Authentication</h3>
            <p className="text-sm text-orange-700 m-0">
              Add an extra layer of protection to your account.
            </p>
          </div>
          <Switch
            checked={twoFA}
            onChange={(checked) => {
              setTwoFA(checked);
              message.info("Two-factor settings will be updated soon.");
            }}
          />
        </div>
      </Card>
      <Card className="rounded-2xl border border-red-100 bg-red-50/70" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-6">
          <div>
            <h3 className="font-semibold text-red-800 m-0">Logout</h3>
            <p className="text-sm text-red-700 m-0">
              Sign out of your account. You'll need to log in again to access your account.
            </p>
          </div>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={confirmLogout}
            className="w-full md:w-auto"
          >
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderBillingTab = (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileTextOutlined className="text-xl text-amber-500" />
            <h3 className="text-lg font-semibold m-0">Plan Overview</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Review your active plan and trial period.
          </p>
          <Button 
            icon={<FileTextOutlined />}
            onClick={goOverview}
            className="w-full md:w-auto"
          >
            View Plan Overview
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <CreditCardOutlined className="text-xl text-emerald-500" />
            <h3 className="text-lg font-semibold m-0">Subscription Options</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upgrade or adjust your subscription preferences.
          </p>
          <Button 
            icon={<CreditCardOutlined />}
            onClick={goSubscription}
            className="w-full md:w-auto"
          >
            Manage Subscription
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <SolutionOutlined className="text-xl text-blue-500" />
            <h3 className="text-lg font-semibold m-0">Invoices</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Download receipts for your accounting.
          </p>
          <Button 
            icon={<SolutionOutlined />}
            onClick={goInvoices}
            className="w-full md:w-auto"
          >
            View Invoices
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <GiftOutlined className="text-xl text-pink-500" />
            <h3 className="text-lg font-semibold m-0">Coupons</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Redeem promo codes or share vouchers with friends.
          </p>
          <Button 
            icon={<GiftOutlined />}
            onClick={goCoupons}
            className="w-full md:w-auto"
          >
            View Coupons
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderNotificationsTab = (
    <div className="space-y-4">
      {[
        {
          key: "weeklyDigest",
          label: "Weekly progress digest",
          description: "Receive a summary of your child's activity every Monday.",
        },
        {
          key: "homeworkUpdates",
          label: "Homework updates",
          description: "Be notified when new scans or feedback are available.",
        },
        {
          key: "marketingEmails",
          label: "Tips & offers",
          description: "Get product updates and special offers from Kibundo.",
        },
        {
          key: "productAnnouncements",
          label: "Product announcements",
          description: "Hear about new features and betas before anyone else.",
        },
      ].map((pref) => (
        <Card key={pref.key} className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-6">
            <div>
              <h3 className="text-base font-semibold m-0">{pref.label}</h3>
              <p className="text-sm text-gray-600 m-0">{pref.description}</p>
            </div>
            <Switch
              checked={notificationPrefs[pref.key]}
              onChange={(value) => handleNotificationToggle(pref.key, value)}
            />
          </div>
        </Card>
      ))}
      <Button type="primary" icon={<SaveOutlined />} onClick={handleNotificationSave}>
        Save notification preferences
      </Button>
    </div>
  );

  const tabItems = [
    {
      key: "profile",
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          Profile
        </span>
      ),
      children: renderProfileTab,
    },
    {
      key: "security",
      label: (
        <span className="flex items-center gap-2">
          <LockOutlined />
          Security
        </span>
      ),
      children: renderSecurityTab,
    },
    {
      key: "billing",
      label: (
        <span className="flex items-center gap-2">
          <CreditCardOutlined />
          Billing
        </span>
      ),
      children: renderBillingTab,
    },
    {
      key: "notifications",
      label: (
        <span className="flex items-center gap-2">
          <BellOutlined />
          Notifications
        </span>
      ),
      children: renderNotificationsTab,
    },
  ];

  return (
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col md:flex-row md:items-center md:gap-4">
              <Avatar size={64} className="bg-[#FF8400]" style={{ color: "#fff" }}>
                {initials}
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold m-0">Settings</h1>
                <p className="text-gray-600 m-0">
                  Manage your account, family and billing preferences.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                icon={<SwapOutlined />}
                onClick={handleSwitchProfile}
                className="w-full md:w-auto"
              >
                Switch Profile
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#FF8400] via-[#FF9A36] to-[#FFC46B] p-6 text-white shadow-inner">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-white/80 text-sm">Signed in as</div>
                <div className="text-2xl font-semibold">{displayName}</div>
                <div className="text-sm text-white/80">{displayUser.email}</div>
              </div>
              <Space size="middle" wrap>
                <Tag color="gold" className="px-3 py-1 text-sm font-medium">
                  {displayUser.state || "State not set"}
                </Tag>
                <Tag color={twoFA ? "green" : "red"} className="px-3 py-1 text-sm font-medium">
                  {twoFA ? "2FA enabled" : "2FA disabled"}
                </Tag>
              </Space>
            </div>
          </div>

          <Divider />

          <Form form={form} layout="vertical" requiredMark={false}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              tabBarGutter={24}
              className="parent-settings-tabs"
            />

            <Divider />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={save}
                className="w-full md:w-auto"
              >
                Save changes
          </Button>
            </div>
          </Form>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </PlainBackground>
  );
}
