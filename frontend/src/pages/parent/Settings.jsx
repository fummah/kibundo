// src/pages/parent/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, Button, Switch, Select, Row, Col, Divider, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import GradientShell from "@/components/GradientShell";
import { useAuthContext } from "@/context/AuthContext";

export default function Settings() {
  const { user, isAuthenticated } = useAuthContext();
  const [form] = Form.useForm();
  const [twoFA, setTwoFA] = useState(Boolean(user?.mfa_enabled));

  // Map user from AuthContext → form fields
  const initialValues = useMemo(
    () => ({
      first_name: user?.first_name ?? user?.name?.split(" ")?.[0] ?? "",
      last_name:
        user?.last_name ??
        (user?.name ? user.name.split(" ").slice(1).join(" ") : "") ??
        "",
      email: user?.email ?? "",
      phone: user?.contact_number ?? "",
      locale: user?.locale ?? "en-ZA",
      // password intentionally blank
    }),
    [user]
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setTwoFA(Boolean(user?.mfa_enabled));
  }, [initialValues, form, user]);

  const save = async () => {
    try {
      const vals = await form.validateFields();
      // For now we just show a success. Wire this to your API if needed:
      // await api.patch("/me", { ...vals, mfa_enabled: twoFA });
      console.log("Saving settings (demo):", { ...vals, mfa_enabled: twoFA });
      message.success("Settings saved");
    } catch {
      /* antd shows validation errors */
    }
  };

  return (
    <GradientShell>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold m-0">Settings</h1>
          <p className="text-gray-600 m-0">
            {isAuthenticated ? "Manage your account and preferences." : "Please sign in to edit settings."}
          </p>
        </div>

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
                <Form.Item label="Phone" name="phone">
                  <Input className="rounded-xl" placeholder="+27 82 123 4567" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Locale" name="locale">
                  <Select
                    className="rounded-xl"
                    options={[
                      { value: "en-ZA", label: "English (South Africa)" },
                      { value: "en-GB", label: "English (UK)" },
                      { value: "de-DE", label: "Deutsch" },
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
                  <Input.Password className="rounded-xl" placeholder="••••••••" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Two-factor Authentication">
                  <Switch checked={twoFA} onChange={setTwoFA} />
                </Form.Item>
              </Col>
            </Row>

            <div className="flex justify-end">
              <Button type="primary" icon={<SaveOutlined />} onClick={save}>
                Save
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </GradientShell>
  );
}
