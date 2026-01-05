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
import { useTranslation } from "react-i18next";

import { useAuthContext } from "@/context/AuthContext.jsx";
import api from "@/api/axios";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";

const { useBreakpoint } = Grid;

export default function Settings() {
  const { t } = useTranslation();
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
        message.error(t("parent.settings.messages.loadFailed"));
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
        message.error(t("parent.settings.messages.userNotFound"));
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

      message.success(t("parent.settings.messages.saveSuccess"));
    } catch (error) {
      // AntD form validation error (required fields, formats, etc.)
      if (error?.errorFields) {
        console.error("Validation error saving settings:", error);
        message.error(t("parent.settings.messages.validationError"));
        return;
      }

      console.error("Error saving settings:", {
        error,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      message.error(
        serverMessage
          ? t("parent.settings.messages.saveFailedWithMessage", { message: serverMessage })
          : t("parent.settings.messages.saveFailed")
      );
    }
  };

  const handleSwitchProfile = () => {
    navigate("/parent/account", { replace: true });
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: t("parent.settings.security.logoutConfirmTitle"),
      okText: t("parent.settings.security.logoutConfirmOk"),
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
      t={t}
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
  t,
}) {
  const displayUser = currentUser || {};
  const displayName = useMemo(() => {
    const first = displayUser.first_name || "";
    const last = displayUser.last_name || "";
    const name = `${first} ${last}`.trim();
    if (name) return name;
    if (displayUser.name) return displayUser.name;
    if (displayUser.email) return displayUser.email.split("@")[0];
    return t("parent.settings.defaultDisplayName");
  }, [displayUser, t]);

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
    message.success(t("parent.settings.notifications.preferencesSaved"));
  };

  const renderProfileTab = (
    <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={t("parent.settings.profile.firstName")}
                name="first_name"
                rules={[{ required: true, message: t("parent.settings.profile.firstNameRequired") }]}
              >
                <Input className="rounded-xl" placeholder={t("parent.settings.profile.firstNamePlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t("parent.settings.profile.lastName")}
                name="last_name"
                rules={[{ required: true, message: t("parent.settings.profile.lastNameRequired") }]}
              >
                <Input className="rounded-xl" placeholder={t("parent.settings.profile.lastNamePlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t("parent.settings.profile.email")}
                name="email"
                rules={[{ type: "email", message: t("parent.settings.profile.emailInvalid") }]}
              >
                <Input className="rounded-xl" placeholder={t("parent.settings.profile.emailPlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={t("parent.settings.profile.phone")}
                name="phone"
              >
                <Input
                  className="rounded-xl"
                  placeholder={t("parent.settings.profile.phonePlaceholder")}
                  onChange={(e) => {
                    const digits = e.target.value;
                    form.setFieldsValue({ phone: digits });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item 
                label={t("parent.settings.profile.state")} 
                name="state"
              >
                <Select
                  placeholder={t("parent.settings.profile.statePlaceholder")}
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
              <Form.Item label={t("parent.settings.profile.locale")} name="locale">
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
                label={t("parent.settings.security.newPassword")}
                name="password"
                tooltip={t("parent.settings.security.passwordTooltip")}
              >
            <Input.Password placeholder={t("parent.settings.security.newPasswordPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>
      <Card className="rounded-2xl border border-orange-100 bg-orange-50/70" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-6">
          <div>
            <h3 className="font-semibold text-orange-800 m-0">{t("parent.settings.security.twoFactorAuth")}</h3>
            <p className="text-sm text-orange-700 m-0">
              {t("parent.settings.security.twoFactorAuthDescription")}
            </p>
          </div>
          <Switch
            checked={twoFA}
            onChange={(checked) => {
              setTwoFA(checked);
              message.info(t("parent.settings.security.twoFactorAuthInfo"));
            }}
          />
        </div>
      </Card>
      <Card className="rounded-2xl border border-red-100 bg-red-50/70" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-6">
          <div>
            <h3 className="font-semibold text-red-800 m-0">{t("parent.settings.security.logout")}</h3>
            <p className="text-sm text-red-700 m-0">
              {t("parent.settings.security.logoutDescription")}
            </p>
          </div>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={confirmLogout}
            className="w-full md:w-auto"
          >
            {t("parent.settings.security.logoutButton")}
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
            <h3 className="text-lg font-semibold m-0">{t("parent.settings.billing.planOverview")}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.settings.billing.planOverviewDescription")}
          </p>
          <Button 
            icon={<FileTextOutlined />}
            onClick={goOverview}
            className="w-full md:w-auto"
          >
            {t("parent.settings.billing.viewPlanOverview")}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <CreditCardOutlined className="text-xl text-emerald-500" />
            <h3 className="text-lg font-semibold m-0">{t("parent.settings.billing.subscriptionOptions")}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.settings.billing.subscriptionDescription")}
          </p>
          <Button 
            icon={<CreditCardOutlined />}
            onClick={goSubscription}
            className="w-full md:w-auto"
          >
            {t("parent.settings.billing.manageSubscription")}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <SolutionOutlined className="text-xl text-blue-500" />
            <h3 className="text-lg font-semibold m-0">{t("parent.settings.billing.invoices")}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.settings.billing.invoicesDescription")}
          </p>
          <Button 
            icon={<SolutionOutlined />}
            onClick={goInvoices}
            className="w-full md:w-auto"
          >
            {t("parent.settings.billing.viewInvoices")}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-neutral-100" styles={{ body: { padding: 0 } }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <GiftOutlined className="text-xl text-pink-500" />
            <h3 className="text-lg font-semibold m-0">{t("parent.settings.billing.coupons")}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t("parent.settings.billing.couponsDescription")}
          </p>
          <Button 
            icon={<GiftOutlined />}
            onClick={goCoupons}
            className="w-full md:w-auto"
          >
            {t("parent.settings.billing.viewCoupons")}
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
          label: t("parent.settings.notifications.weeklyDigest"),
          description: t("parent.settings.notifications.weeklyDigestDescription"),
        },
        {
          key: "homeworkUpdates",
          label: t("parent.settings.notifications.homeworkUpdates"),
          description: t("parent.settings.notifications.homeworkUpdatesDescription"),
        },
        {
          key: "marketingEmails",
          label: t("parent.settings.notifications.tipsOffers"),
          description: t("parent.settings.notifications.tipsOffersDescription"),
        },
        {
          key: "productAnnouncements",
          label: t("parent.settings.notifications.productAnnouncements"),
          description: t("parent.settings.notifications.productAnnouncementsDescription"),
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
              style={{
                backgroundColor: notificationPrefs[pref.key] ? "#EF7C2E" : undefined,
              }}
            />
          </div>
        </Card>
      ))}
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleNotificationSave}
        style={{
          width: 317,
          height: 49,
          borderRadius: 32,
          background: "#EF7C2E",
          border: "none",
          fontFamily: "Nunito",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: "2%",
        }}
      >
        {t("parent.settings.notifications.savePreferences")}
      </Button>
    </div>
  );

  const tabItems = [
    {
      key: "profile",
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          {t("parent.settings.tabs.profile")}
        </span>
      ),
      children: renderProfileTab,
    },
    {
      key: "security",
      label: (
        <span className="flex items-center gap-2">
          <LockOutlined />
          {t("parent.settings.tabs.security")}
        </span>
      ),
      children: renderSecurityTab,
    },
    {
      key: "billing",
      label: (
        <span className="flex items-center gap-2">
          <CreditCardOutlined />
          {t("parent.settings.tabs.billing")}
        </span>
      ),
      children: renderBillingTab,
    },
    {
      key: "notifications",
      label: (
        <span className="flex items-center gap-2">
          <BellOutlined />
          {t("parent.settings.tabs.notifications")}
        </span>
      ),
      children: renderNotificationsTab,
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 pb-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col md:flex-row md:items-center md:gap-4">
              <Avatar size={64} className="bg-[#EF7C2E]" style={{ color: "#fff" }}>
                {initials}
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold m-0">{t("parent.settings.title")}</h1>
                <p className="text-gray-600 m-0">
                  {t("parent.settings.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                icon={<SwapOutlined />}
                onClick={handleSwitchProfile}
                style={{
                  height: 49,
                  borderRadius: 32,
                  background: "#EF7C2E",
                  border: "none",
                  fontFamily: "Nunito",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "2%",
                  color: "#FFFFFF",
                  boxShadow: "1px 1px 3px rgba(0,0,0,0.25)",
                  paddingInline: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {t("parent.settings.switchProfile")}
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm border border-[#E5E5E5]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm" style={{ color: "#544C3B" }}>
                  {t("parent.settings.signedInAs")}
                </div>
                <div className="text-2xl font-semibold" style={{ color: "#3A362E" }}>
                  {displayName}
                </div>
                <div className="text-sm" style={{ color: "#544C3B" }}>
                  {displayUser.email}
                </div>
              </div>
              {/* Tags omitted to match the simple Figma header card */}
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
                style={{
                  height: 49,
                  borderRadius: 32,
                  background: "#EF7C2E",
                  border: "none",
                  fontFamily: "Nunito",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "2%",
                  paddingInline: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
                >
                {t("parent.settings.saveChanges")}
          </Button>
            </div>
          </Form>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </div>
  );
}
