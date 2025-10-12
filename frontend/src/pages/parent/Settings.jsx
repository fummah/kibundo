// src/pages/parent/Settings.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Form, Input, Button, Switch, Select,
  Row, Col, Divider, message, Modal, Grid
} from "antd";
import {
  SaveOutlined, LogoutOutlined, ArrowLeftOutlined,
  CreditCardOutlined, FileTextOutlined, GiftOutlined, SolutionOutlined,
} from "@ant-design/icons";

import { useAuthContext } from "@/context/AuthContext.jsx";
import ParentShell from "@/components/parent/ParentShell.jsx";
import globalBg from "@/assets/backgrounds/global-bg.png";

const { useBreakpoint } = Grid;

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuthContext();
  const [form] = Form.useForm();
  const [twoFA, setTwoFA] = useState(Boolean(user?.mfa_enabled));
  const navigate = useNavigate();
  const { lg } = useBreakpoint(); // ✅ true on large screens

  const formatDEPhone = useCallback((raw = "") => {
    const digits = String(raw).replace(/[^\d]/g, "");
    let rest = digits;
    if (rest.startsWith("49")) rest = rest.slice(2);
    if (rest.startsWith("0")) rest = rest.replace(/^0+/, "");
    return `+49 ${rest}`.trim();
  }, []);

  const initialValues = useMemo(() => ({
    first_name: user?.first_name ?? user?.name?.split(" ")?.[0] ?? "",
    last_name:
      user?.last_name ?? (user?.name ? user.name.split(" ").slice(1).join(" ") : "") ?? "",
    email: user?.email ?? "",
    phone: user?.contact_number ? formatDEPhone(user.contact_number) : "+49 ",
    locale: user?.locale ?? "de-DE",
  }), [user, formatDEPhone]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setTwoFA(Boolean(user?.mfa_enabled));
  }, [initialValues, form, user]);

  const save = async () => {
    try {
      const vals = await form.validateFields();
      // await api.put("/me", { ...vals, mfa_enabled: twoFA });
      message.success("Settings saved");
    } catch {/* antd handles errors */}
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: "Log out?",
      okText: "Log out",
      okButtonProps: { danger: true, icon: <LogoutOutlined /> },
      onOk: async () => {
        try { await logout?.(); } catch { navigate("/parent"); }
      },
    });
  };

  const openBilling = () => navigate("/parent/billing");
  const goOverview     = (e) => { e?.stopPropagation(); navigate("/parent/billing/overview"); };
  const goSubscription = (e) => { e?.stopPropagation(); navigate("/parent/billing/subscription"); };
  const goInvoices     = (e) => { e?.stopPropagation(); navigate("/parent/billing/invoices"); };
  const goCoupons      = (e) => { e?.stopPropagation(); navigate("/parent/billing/coupons"); };

  // Use ParentShell for all breakpoints; it handles the framed layout and sticky bottom nav
  return (
    <ParentShell bgImage={globalBg}>
      <SettingsContent
        form={form}
        isAuthenticated={isAuthenticated}
        twoFA={twoFA}
        setTwoFA={setTwoFA}
        confirmLogout={confirmLogout}
        save={save}
        openBilling={openBilling}
        goOverview={goOverview}
        goSubscription={goSubscription}
        goInvoices={goInvoices}
        goCoupons={goCoupons}
        navigate={navigate}
      />
    </ParentShell>
  );
}

/* ---------- Presentational content ---------- */
function SettingsContent({
  form,
  isAuthenticated,
  twoFA,
  setTwoFA,
  confirmLogout,
  save,
  openBilling,
  goOverview,
  goSubscription,
  goInvoices,
  goCoupons,
  navigate,
}) {
  return (
    <section className="relative w-full max-w-[520px] mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/parent"); }}
          className="!p-0 !h-auto text-neutral-700"
          aria-label="Back"
        />
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold m-0">Settings</h1>
          <p className="text-gray-600 m-0">
            {isAuthenticated ? "Manage your account, security, and billing." : "Please sign in to edit settings."}
          </p>
        </div>
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
                      return ok ? Promise.resolve() : Promise.reject(new Error("Please enter a valid German phone number (e.g., +49 30 12345678 or 030 12345678)"));
                    },
                  },
                ]}
              >
                <Input
                  className="rounded-xl"
                  placeholder="+49 30 12345678"
                  onChange={(e) => {
                    const digits = e.target.value;
                    // optional: live-format outside of validation
                    // setTimeout avoids cursor jump; or keep as-is:
                    form.setFieldsValue({ phone: digits });
                  }}
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

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="New Password"
                name="password"
                tooltip="Leave blank to keep your current password"
              >
                <Input.Password placeholder="" />
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

      {/* Billing & Payments */}
      <Card
        className="rounded-2xl shadow-sm hover:shadow transition cursor-pointer"
        onClick={() => navigate("/parent/billing")}
        styles={{ body: { padding: 16 } }}
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
          <Button block icon={<SolutionOutlined />} onClick={goOverview}>
            Overview
          </Button>
          <Button block icon={<CreditCardOutlined />} onClick={goSubscription}>
            Subscription
          </Button>
          <Button block icon={<FileTextOutlined />} onClick={goInvoices}>
            Invoices
          </Button>
          <Button block icon={<GiftOutlined />} onClick={goCoupons}>
            Coupons
          </Button>
        </div>
      </Card>
    </section>
  );
}
