import React, { useEffect } from "react";
import { Button, Card, Form, Input, InputNumber, Radio, Select, Space, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader.jsx";
import { createProduct, getProduct, updateProduct } from "./_api";

export default function Product() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const productId = useLocation()?.state?.id;

  const { data } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        name: data.name, status: data.status || "active", plan_type: data.plan_type || "subscription",
        interval: data.interval || "month", amount: data.amount, currency: data.currency || "EUR",
        description: data.description
      });
    }
  }, [data, form]);

  const createMut = useMutation({
    mutationFn: (payload) => createProduct(payload),
    onSuccess: () => { message.success("Product created"); qc.invalidateQueries({ queryKey: ["products"] }); navigate("/admin/billing"); }
  });
  const updateMut = useMutation({
    mutationFn: (payload) => updateProduct(productId, payload),
    onSuccess: () => { message.success("Product updated"); qc.invalidateQueries({ queryKey: ["products"] }); navigate("/admin/billing"); }
  });

  const onSubmit = async () => {
    const v = await form.validateFields();
    if (productId) updateMut.mutate(v); else createMut.mutate(v);
  };

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader title={productId ? "Edit Product" : "New Product"} />
      <div className="p-3 md:p-4">
        <Card>
          <Form layout="vertical" form={form} initialValues={{ status: "active", plan_type: "subscription", interval: "month", currency: "EUR" }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"><Input.TextArea rows={4} /></Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item name="plan_type" label="Type">
                <Radio.Group
                  options={[{label:"Subscription",value:"subscription"},{label:"One-time",value:"one_time"}]}
                  optionType="button" buttonStyle="solid"
                />
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Radio.Group
                  options={[{label:"Active",value:"active"},{label:"Archived",value:"archived"}]}
                  optionType="button" buttonStyle="solid"
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={0} step={1} />
              </Form.Item>
              <Form.Item name="currency" label="Currency">
                <Select options={["EUR","USD","GBP"].map(v=>({value:v,label:v}))} />
              </Form.Item>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) =>
                  getFieldValue("plan_type") === "subscription" ? (
                    <Form.Item name="interval" label="Interval">
                      <Select options={[{value:"month",label:"Monthly"},{value:"year",label:"Yearly"}]} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </div>

            <Space>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="primary" loading={createMut.isPending || updateMut.isPending} onClick={onSubmit}>
                {productId ? "Save" : "Create"}
              </Button>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
}
