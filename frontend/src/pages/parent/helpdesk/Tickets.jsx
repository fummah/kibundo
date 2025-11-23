// src/pages/parent/helpdesk/Tickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
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
import PlainBackground from "@/components/layouts/PlainBackground";
import BottomTabBar from "@/components/parent/BottomTabBar.jsx";

// ParentShell is now handled at route level

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
    <PlainBackground className="flex flex-col h-screen overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 py-10 pb-24">
          <div className="space-y-6">
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
            <div className="rounded-2xl shadow-sm bg-white p-6">
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
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom tab bar */}
      <div className="flex-shrink-0">
        <BottomTabBar />
      </div>
    </PlainBackground>
  );
}
