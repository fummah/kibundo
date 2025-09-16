import React from "react";
import { Button, Drawer, Tabs, Form, Divider, Select, Input } from "antd";
import QuestionEditor from "./QuestionEditor.jsx";
import RichText from "./RichText.jsx";

export default function QuizDrawer({
  open,
  onClose,
  onSubmit,
  initialValues,
  saving,
  constants,
}) {
  const [form] = Form.useForm();

  // Stable record identifier to manage hydration
  const recordId = initialValues?.id ?? "new";
  const lastHydrated = React.useRef(null);

  // Hydrate ONLY when drawer is open and the record changes
  React.useEffect(() => {
    if (!open) return;
    if (lastHydrated.current === recordId) return;

    // Ensure ID is present in the form so it gets submitted
    const base = initialValues ? { id: initialValues.id, ...initialValues } : {};
    form.setFieldsValue(base);
    lastHydrated.current = recordId;
  }, [open, recordId, initialValues, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    // values now includes `id` when editing
    onSubmit(values);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={initialValues?.id ? "Edit Quiz" : "New Quiz"}
      width={Math.min(
        900,
        typeof window !== "undefined" ? window.innerWidth - 32 : 900
      )}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}>
            {initialValues?.id ? "Save" : "Create"}
          </Button>
        </div>
      }
    >
      <Tabs
        defaultActiveKey="details"
        destroyInactiveTabPane={false} // keep Quill mounted
        items={[
          {
            key: "details",
            label: "Details",
            children: (
              <Form
                key={recordId} // ensures clean state when switching records
                layout="vertical"
                form={form}
                initialValues={{
                  status: "draft",
                  difficulty: "easy",
                  grade: 1,
                  objectives: [],
                  items: [],
                }}
              >
                {/* Ensure ID is part of values when editing */}
                <Form.Item name="id" hidden>
                  <Input />
                </Form.Item>

                <Form.Item
                  name="title"
                  label="Title"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Description"
                  valuePropName="value"
                  getValueFromEvent={(v) => v}
                >
                  <RichText placeholder="Describe the quiz (instructions, context, etc.)" />
                </Form.Item>

                <Form.Item
                  name="bundesland"
                  label="Bundesland"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={constants.BUNDESLAENDER.map((b) => ({
                      value: b,
                      label: b,
                    }))}
                  />
                </Form.Item>

                <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="grade" label="Grade" rules={[{ required: true }]}>
                  <Select
                    options={constants.GRADES.map((g) => ({
                      value: g,
                      label: `Grade ${g}`,
                    }))}
                  />
                </Form.Item>

                <Form.Item name="difficulty" label="Difficulty">
                  <Select
                    options={["easy", "medium", "hard"].map((d) => ({
                      value: d,
                      label: d,
                    }))}
                  />
                </Form.Item>

                <Form.Item name="objectives" label="Learning Goals">
                  <Select mode="tags" placeholder="Add goals (Enter)" />
                </Form.Item>

                <Form.Item name="tags" label="Tags">
                  <Select mode="tags" placeholder="Add tags (Enter)" />
                </Form.Item>

                <Divider />

                <Form.Item name="status" label="Status">
                  <Select
                    options={["draft", "review", "live"].map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "editor",
            label: "Editor",
            children: (
              <Form form={form} layout="vertical" component={false}>
                <QuestionEditor />
              </Form>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
