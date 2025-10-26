// src/pages/parent/helpdesk/Tickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Upload,
  message as antdMessage,
  Typography,
  App,
} from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  SendOutlined,
} from "@ant-design/icons";

import ParentShell from "@/components/parent/ParentShell"; // ✅ uses sticky bottom bar + spacer
import globalBg from "@/assets/backgrounds/global-bg.png"; // optional background

const { Title, Text } = Typography;

export default function Tickets() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  // spec: required free text, with minimum length
  const MIN_LEN = 20;

  const categories = useMemo(
    () => [
      { label: t("helpdesk.categories.general"), value: "general" },
      { label: t("helpdesk.categories.billing"), value: "billing" },
      { label: t("helpdesk.categories.technical"), value: "technical" },
      { label: t("helpdesk.categories.content"), value: "content" },
      { label: t("helpdesk.categories.other"), value: "other" },
    ],
    [t]
  );

  useEffect(() => {
    form.setFieldsValue({
      category: "general",
      subject: "",
      message: "",
      attachments: [],
    });
  }, [form]);

  const beforeUpload = () => false; // prevent auto-upload

  const onFinish = async (values) => {
    try {
      setSubmitting(true);

      const msg = (values.message || "").trim();
      if (msg.length < MIN_LEN) {
        throw new Error(t("helpdesk.minCharacters", { count: MIN_LEN }));
      }

      // Simulate API call
      await new Promise((res) => setTimeout(res, 700));

      message.success(t("helpdesk.ticketSubmitted"));
      form.resetFields();
      form.setFieldsValue({ category: "general" });
    } catch (e) {
      const errText =
        e?.message || "Could not submit your ticket. Please try again.";
      message.error(errText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ParentShell bgImage={globalBg}>
      <div className="w-full min-h-[100dvh] flex justify-center">
        {/* Single-column layout inside the phone mockup; sticky footer handled by ParentShell */}
        <section className="relative w-full max-w-[520px] px-4 pt-6 mx-auto space-y-6">
          {/* Header with Back Arrow */}
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              className="!p-0 !h-auto text-neutral-700"
              aria-label="Back"
            />
            <div>
              <Title level={3} className="!m-0">
                Feedback
              </Title>
              <Text type="secondary">Submit a ticket to our support team.</Text>
            </div>
          </div>

          {/* Ticket Form */}
          <Card className="rounded-2xl shadow-sm">
            <Form form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
              <Form.Item name="category" label="Category">
                <Select options={categories} className="rounded-xl" popupMatchSelectWidth={false} />
              </Form.Item>

              <Form.Item
                name="subject"
                label="Subject"
                rules={[
                  { required: true, message: "Please enter a subject" },
                  { min: 3, message: "Please enter at least 3 characters" },
                ]}
              >
                <Input className="rounded-xl" placeholder="Short summary" />
              </Form.Item>

              <Form.Item
                name="message"
                label="Message"
                rules={[
                  { required: true, message: "This field is required." },
                  {
                    validator: (_, value) => {
                      const len = (value || "").trim().length;
                      if (len === 0) return Promise.reject("This field is required.");
                      if (len < MIN_LEN) return Promise.reject(`Please enter at least ${MIN_LEN} characters.`);
                      return Promise.resolve();
                    },
                  },
                ]}
                extra={<Text type="secondary">Minimum {MIN_LEN} characters. Describe your issue clearly.</Text>}
              >
                <Input.TextArea
                  className="rounded-xl"
                  placeholder="Write your message here…"
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  showCount
                />
              </Form.Item>

              <Form.Item name="attachments" label="Attachments" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
                <Upload multiple beforeUpload={beforeUpload} listType="text" maxCount={5}>
                  <Button icon={<UploadOutlined />}>Add files</Button>
                </Upload>
              </Form.Item>

              <div className="flex justify-end gap-2">
                <Button onClick={() => form.resetFields()}>Cancel</Button>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
                  Submit
                </Button>
              </div>
            </Form>
          </Card>
          {/* Spacer + BottomTabBar are handled by ParentShell (sticky inside the scroller) */}
        </section>
      </div>
    </ParentShell>
  );
}
