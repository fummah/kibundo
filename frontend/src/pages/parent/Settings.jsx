// src/pages/parent/Settings.jsx
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
} from "antd";
import {
  SaveOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  GiftOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import BottomTabBar, { ParentTabSpacer } from "@/components/parent/BottomTabBar";
import { useAuthContext } from "@/context/AuthContext";

/* Optional: same background as other parent screens */
import globalBg from "@/assets/backgrounds/global-bg.png";

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuthContext();
  const [form] = Form.useForm();
  const [twoFA, setTwoFA] = useState(Boolean(user?.mfa_enabled));
  const navigate = useNavigate();

  // ------- helpers -------
  // Keep +49 prefix and strip non-digits beyond that, simple friendly formatter.
  const formatDEPhone = useCallback((raw = "") => {
    const digits = String(raw).replace(/[^\d]/g, "");
    let rest = digits;

    // drop country code if user typed it again
    if (rest.startsWith("49")) rest = rest.slice(2);
    // drop leading zero(s)
    if (rest.startsWith("0")) rest = rest.replace(/^0+/, "");

    return `+49 ${rest}`.trim();
  }, []);

  const initialValues = useMemo(
    () => ({
      first_name: user?.first_name ?? user?.name?.split(" ")?.[0] ?? "",
      last_name:
        user?.last_name ??
        (user?.name ? user.name.split(" ").slice(1).join(" ") : "") ??
        "",
      email: user?.email ?? "",
      phone: user?.contact_number
        ? formatDEPhone(user.contact_number)
        : "+49 ", // 🇩🇪 default German prefix
      locale: user?.locale ?? "de-DE", // 🇩🇪 default German locale
      // password intentionally blank
    }),
    [user, formatDEPhone]
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setTwoFA(Boolean(user?.mfa_enabled));
  }, [initialValues, form, user]);

  const save = async () => {
    try {
      const vals = await form.validateFields();
      // Persist to backend here
      // await api.saveSettings({...vals, mfa_enabled: twoFA})
      console.log("Saving settings (demo):", { ...vals, mfa_enabled: twoFA });
      message.success("Settings saved");
    } catch {
      /* antd shows validation errors */
    }
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: "Log out?",
      okText: "Log out",
      okButtonProps: { danger: true, icon: <LogoutOutlined /> },
      onOk: async () => {
        try {
          await logout?.();
        } catch (e) {
          // Fallback: navigate home even if context logout isn't wired yet
          navigate("/parent");
        }
      },
    });
  };

  // Billing routes helpers
  const openBilling = () => navigate("/parent/billing"); // goes to overview via redirect
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
    <GradientShell backgroundImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        {/* Single-column layout on ALL sizes; footer handled by ParentTabSpacer + BottomTabBar */}
        <section className="relative w-full max-w-[520px] px-4 pt-6 mx-auto space-y-6">
          {/* Header with Back Arrow */}
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate("/parent");
              }}
              className="!p-0 !h-auto text-neutral-700"
              aria-label="Back"
            />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold m-0">Settings</h1>
              <p className="text-gray-600 m-0">
                {isAuthenticated
                  ? "Manage your account, security, and billing."
                  : "Please sign in to edit settings."}
              </p>
            </div>

            {/* Quick access to Billing from the header */}
            <Button type="primary" icon={<CreditCardOutlined />} onClick={openBilling}>
              Billing
            </Button>
          </div>

          {/* Profile & Security */}
          <Card className="rounded-2xl shadow-sm">
            <Form form={form} layout="vertical" requiredMark={false}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="First Name"
                    name="first_name"
                    rules={[{ required: true, message: "Please enter your first name" }]}
                  >
                    {/* ❗️No id prop -> avoids duplicate IDs */}
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
                          // very light validation: must start with +49 and have at least 5 digits following
                          const ok = /^\+49\s?\d{5,}$/.test(v.replace(/\s+/g, " "));
                          return ok
                            ? Promise.resolve()
                            : Promise.reject(new Error("Enter a German number starting with +49"));
                        },
                      },
                    ]}
                  >
                    <Input
                      className="rounded-xl"
                      placeholder="+49 170 1234567" // 🇩🇪 German format hint
                      onChange={(e) => {
                        const next = formatDEPhone(e.target.value);
                        form.setFieldsValue({ phone: next });
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Locale" name="locale">
                    {/* Keep minimal options; no id prop */}
                    <Select
                      className="rounded-xl"
                      options={[
                        { value: "de-DE", label: "Deutsch (Deutschland)" },
                        { value: "en-ZA", label: "English (South Africa)" },
                        { value: "en-GB", label: "English (UK)" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="New Password"
                    name="password"
                    tooltip="Leave blank to keep your current password"
                  >
                    <Input.Password className="rounded-xl" placeholder="" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Two-factor Authentication">
                    <Switch checked={twoFA} onChange={setTwoFA} />
                  </Form.Item>
                </Col>
              </Row>

              <div className="flex justify-between">
                <Button danger icon={<LogoutOutlined />} onClick={confirmLogout}>
                  Logout
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={save}>
                  Save
                </Button>
              </div>
            </Form>
          </Card>

          {/* Billing & Payments (card opens /parent/billing; buttons go to subpages) */}
          <Card
            className="rounded-2xl shadow-sm hover:shadow transition cursor-pointer"
            onClick={openBilling}
            bodyStyle={{ padding: 16 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-100">
                <CreditCardOutlined />
              </div>
              <div className="flex-1">
                <h3 className="m-0 text-base font-semibold">Billing &amp; Payments</h3>
                <p className="m-0 text-gray-600 text-sm">
                  Manage your plan, payment methods, and invoices.
                </p>
              </div>
              <Button onClick={goOverview} icon={<FileTextOutlined />}>
                Open
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                block
                icon={<SolutionOutlined />}
                onClick={goOverview}
                aria-label="Billing Overview"
              >
                Overview
              </Button>
              <Button
                block
                icon={<CreditCardOutlined />}
                onClick={goSubscription}
                aria-label="Manage Subscription"
              >
                Subscription
              </Button>
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={goInvoices}
                aria-label="View Invoices"
              >
                Invoices
              </Button>
              <Button
                block
                icon={<GiftOutlined />}
                onClick={goCoupons}
                aria-label="Apply Coupons"
              >
                Coupons
              </Button>
            </div>
          </Card>

          {/* Spacer so content never hides behind the footer */}
          <ParentTabSpacer />

          {/* Footer tab bar (mobile: fixed; desktop mockup: absolute inside frame) */}
          <BottomTabBar />
        </section>
      </div>
    </GradientShell>
  );
}
