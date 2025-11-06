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
import api from "@/api/axios";

const { useBreakpoint } = Grid;

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuthContext();
  const [form] = Form.useForm();
  const [twoFA, setTwoFA] = useState(Boolean(user?.mfa_enabled));
  const navigate = useNavigate();
  const { lg } = useBreakpoint(); // ✅ true on large screens
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
        // Fetch current user to get full data including state
        const userRes = await api.get("/current-user");
        const userData = userRes?.data?.user || userRes?.data || user;
        setCurrentUser(userData);

        // Fetch states list
        const statesRes = await api.get("/states");
        const statesData = Array.isArray(statesRes.data) 
          ? statesRes.data 
          : (statesRes.data?.data || []);
        
        const processedStates = statesData.map(state => {
          if (state && typeof state === 'object') {
            const value = state.state_name || state.name || state.id;
            const label = state.state_name || state.name || state.id;
            return { 
              value: String(value), 
              label: String(label)
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
  }, [isAuthenticated]);

  const initialValues = useMemo(() => {
    const userData = currentUser || user;
    return {
      first_name: userData?.first_name ?? userData?.name?.split(" ")?.[0] ?? "",
      last_name:
        userData?.last_name ?? (userData?.name ? userData.name.split(" ").slice(1).join(" ") : "") ?? "",
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

      // Convert formatted phone back to raw format (remove +49 prefix and spaces)
      let contact_number = vals.phone;
      if (contact_number) {
        // Remove +49 prefix, spaces, and leading zeros
        contact_number = contact_number.replace(/\+49\s*/g, "").replace(/\s+/g, "").replace(/^0+/, "");
        // Add +49 prefix back if not empty
        if (contact_number) {
          contact_number = `+49${contact_number}`;
        }
      }

      // Prepare update payload
      const updatePayload = {
        first_name: vals.first_name,
        last_name: vals.last_name,
        email: vals.email,
        contact_number: contact_number || null,
        state: vals.state || null,
      };

      // Only include password if provided
      if (vals.password && vals.password.trim()) {
        updatePayload.plain_pass = vals.password;
      }

      // Include locale if supported (backend may ignore if not in schema)
      if (vals.locale) {
        updatePayload.locale = vals.locale;
      }

      // Update user via API
      const response = await api.put(`/users/${userData.id}`, updatePayload);
      
      // Update local state with fresh data
      if (response.data?.user) {
        setCurrentUser(response.data.user);
        // Update form with fresh data
        form.setFieldsValue({
          first_name: response.data.user.first_name,
          last_name: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.contact_number ? formatDEPhone(response.data.user.contact_number) : "+49 ",
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

  return (
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
      states={states}
      loadingStates={loadingStates}
    />
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
  states,
  loadingStates,
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
