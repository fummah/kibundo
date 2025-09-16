import React from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Tag, Tooltip } from "antd";
import {
  ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, PlusOutlined,
} from "@ant-design/icons";
import RichText from "./RichText.jsx";
import {
  qTypes, newQuestion, swap, duplicateAt, isMcq, isShort, isTrueFalse,
} from "@/utils/academics/transforms";
import { SafeText } from "@/utils/safe";

export default function QuestionEditor() {
  // Must be rendered inside a parent <Form> (we do this in QuizDrawer)
  const form = Form.useFormInstance();

  const renderPreview = (q) => {
    if (!q) return <div>-</div>;
    if (isMcq(q)) {
      return (
        <div>
          <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
          <ol className="list-decimal pl-5">
            {(q.choices || []).map((c, i) => (
              <li key={i} className={i === Number(q.answerIndex) ? "font-semibold" : ""}>
                <SafeText value={c?.text} />
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if (isShort(q)) {
      return (
        <div>
          <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
          <div className="text-gray-500">Answer: <SafeText value={q.answerText || "—"} /></div>
        </div>
      );
    }
    // true/false
    return (
      <div>
        <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: q.prompt || "" }} />
        <div className="text-gray-500">Answer: {String(q.answerBool ?? true)}</div>
      </div>
    );
  };

  const addQuestionOfType = (type) => {
    const curr = form.getFieldValue("items") || [];
    form.setFieldsValue({ items: [...curr, newQuestion(type)] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-8 items-center">
        <div className="text-sm text-gray-500">
          {(form.getFieldValue("items") || []).length} item{((form.getFieldValue("items") || []).length) === 1 ? "" : "s"}
        </div>
        <Space wrap>
          {qTypes.map((t) => (
            <Button key={t.value} onClick={() => addQuestionOfType(t.value)} icon={<PlusOutlined />}>
              Add {t.label}
            </Button>
          ))}
        </Space>
      </div>

      <Form.List name="items">
        {(fields, { remove }) => (
          <div className="space-y-12">
            {fields.map(({ key, name, ...rest }, idx) => {
              const type = form.getFieldValue(["items", name, "type"]) || "mcq";

              const moveUp = () => {
                const curr = form.getFieldValue("items") || [];
                if (idx > 0) form.setFieldsValue({ items: swap(curr, idx, idx - 1) });
              };
              const moveDown = () => {
                const curr = form.getFieldValue("items") || [];
                if (idx < curr.length - 1) form.setFieldsValue({ items: swap(curr, idx, idx + 1) });
              };
              const duplicate = () => {
                const curr = form.getFieldValue("items") || [];
                form.setFieldsValue({ items: duplicateAt(curr, idx) });
              };

              return (
                <Card
                  key={key}
                  type="inner"
                  title={
                    <Space wrap>
                      <Tag color="blue">{type === "mcq" ? "MCQ" : type === "short" ? "Short" : "True/False"}</Tag>
                      <span className="font-medium">Question {idx + 1}</span>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Tooltip title="Preview">
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          onClick={() => {
                            Modal.info({
                              title: "Preview",
                              content: renderPreview(form.getFieldValue(["items", name])),
                            });
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Move up"><Button icon={<ArrowUpOutlined />} size="small" onClick={moveUp} /></Tooltip>
                      <Tooltip title="Move down"><Button icon={<ArrowDownOutlined />} size="small" onClick={moveDown} /></Tooltip>
                      <Tooltip title="Duplicate"><Button icon={<CopyOutlined />} size="small" onClick={duplicate} /></Tooltip>
                      <Tooltip title="Remove"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => remove(name)} /></Tooltip>
                    </Space>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-12">
                    <div className="sm:col-span-3">
                      <Form.Item
                        {...rest}
                        name={[name, "prompt"]}
                        label="Prompt"
                        rules={[{ required: true, message: "Enter a question prompt" }]}
                        valuePropName="value"
                        getValueFromEvent={(v) => v}
                      >
                        <RichText placeholder="Type the question… (supports headings, lists, code, etc.)" />
                      </Form.Item>

                      {type === "mcq" && (
                        <>
                          <Form.List name={[name, "choices"]}>
                            {(choiceFields, choiceOps) => (
                              <div className="space-y-2">
                                <div className="text-xs text-gray-500">Choices</div>
                                {choiceFields.map((cf) => (
                                  <div key={cf.key} className="flex items-center gap-2">
                                    <Form.Item
                                      className="flex-1 !mb-0"
                                      name={[cf.name, "text"]}
                                      rules={[{ required: true, message: "Choice text required" }]}
                                    >
                                      <Input placeholder={`Choice ${cf.name + 1}`} />
                                    </Form.Item>
                                    <Button size="small" onClick={() => choiceOps.add({ text: "" }, cf.name + 1)}>+</Button>
                                    <Button size="small" onClick={() => choiceOps.remove(cf.name)} danger>-</Button>
                                  </div>
                                ))}
                                {choiceFields.length === 0 && (
                                  <Button onClick={() => choiceOps.add({ text: "" })} size="small">
                                    Add a choice
                                  </Button>
                                )}
                              </div>
                            )}
                          </Form.List>

                          <Form.Item
                            name={[name, "answerIndex"]}
                            label="Correct Choice (0-based index)"
                            rules={[{ type: "number", transform: (v) => Number(v), required: true }]}
                          >
                            <InputNumber min={0} />
                          </Form.Item>
                        </>
                      )}

                      {type === "short" && (
                        <Form.Item name={[name, "answerText"]} label="Expected Answer">
                          <Input placeholder="Reference answer (optional)" />
                        </Form.Item>
                      )}

                      {type === "true_false" && (
                        <Form.Item name={[name, "answerBool"]} label="Correct Answer">
                          <Select options={[{ value: true, label: "True" }, { value: false, label: "False" }]} />
                        </Form.Item>
                      )}
                    </div>

                    <div className="sm:col-span-1">
                      <Form.Item name={[name, "type"]} label="Type" rules={[{ required: true }]}>
                        <Select options={qTypes} />
                      </Form.Item>
                      <Form.Item name={[name, "points"]} label="Points" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item name={[name, "tags"]} label="Tags">
                        <Select mode="tags" placeholder="Add tags" />
                      </Form.Item>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Form.List>
    </div>
  );
}
