// src/components/EntityForm.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card, Form, Input, Select, Button, Typography, Space, message,
  Divider, Affix, Tooltip, DatePicker, InputNumber
} from "antd";
import {
  ArrowLeftOutlined, SaveOutlined, QuestionCircleOutlined,
  DownOutlined, UpOutlined, EnvironmentOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";
import MapPickerModal from "@/components/MapPickerModal";

const { Title, Text } = Typography;

/* Optional validator export at bottom */
const httpsUrlRule = () => ({
  validator(_, v) {
    if (!v) return Promise.resolve();
    try {
      const u = new URL(v);
      if (u.protocol !== "https:") return Promise.reject(new Error("Use an HTTPS URL"));
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error("Enter a valid URL"));
    }
  },
});

/**
 * EntityForm
 * Props:
 *  - id, titleNew, titleEdit
 *  - apiCfg: {
 *      getPath, createPath, updatePath,
 *      create: async (api, payload) => res,     // optional override for custom create
 *      afterCreate: (res) => ({ preventRedirect?: true }) | void,
 *      afterUpdate: (res) => ({ preventRedirect?: true }) | void,
 *      onSubmitError: (err) => void
 *    }
 *  - fields: [{ name, label, input, ... async select config ... }]
 *  - initialValues
 *  - transformSubmit: (values) => payload      // <— now supported!
 *  - toListRelative, toDetailRelative, basePath, baseRoute
 *  - layoutMode, submitLabel
 */
export default function EntityForm({
  id: idProp,
  titleNew,
  titleEdit,
  baseRoute,
  basePath,
  apiCfg = {},
  fields,
  initialValues = {},
  toListRelative = "..",
  toDetailRelative = (rid) => `${rid}`,
  layoutMode = "lead",
  submitLabel,
  transformSubmit, // <-- NEW: apply custom submit payload mapping
}) {
  const params = useParams();
  const id = idProp ?? params.id;
  const isEdit = !!id && id !== "new";

  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // sticky bar
  const allValues = Form.useWatch([], form);
  const isDirty = useMemo(() => form.isFieldsTouched(true), [allValues, form]);

  // geo modal
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoFieldCfg, setGeoFieldCfg] = useState(null);

  // async select options
  const [selectOptions, setSelectOptions] = useState({});
  const [selectLoading, setSelectLoading] = useState({});
  const searchTimers = useRef({});

  const setOpts = (key, opts) =>
    setSelectOptions((prev) => ({ ...prev, [key]: Array.isArray(opts) ? opts : [] }));
  const setOptsLoading = (key, val) =>
    setSelectLoading((prev) => ({ ...prev, [key]: !!val }));

  const deepGet = (obj, path) => {
    if (Array.isArray(path)) return path.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
    if (typeof path === "string" && path.includes(".")) {
      return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
    }
    return typeof path === "string" ? obj?.[path] : undefined;
  };

  const computeGetPath = (rid) => (apiCfg.getPath ? apiCfg.getPath(rid) : `${baseRoute}/${rid}`);
  const computeUpdatePath = (rid) => (apiCfg.updatePath ? apiCfg.updatePath(rid) : `${baseRoute}/${rid}`);
  const computeCreatePath = () => (apiCfg.createPath ? apiCfg.createPath : baseRoute);

  const goToList = useCallback(() => {
    basePath ? navigate(basePath) : navigate(toListRelative);
  }, [navigate, basePath, toListRelative]);

  const goToDetail = useCallback((rid) => {
    basePath ? navigate(`${basePath}/${rid}`) : navigate(toDetailRelative(rid));
  }, [navigate, basePath, toDetailRelative]);

  // load entity
  const load = useCallback(async () => {
    if (!isEdit) {
      setLoading(false);
      form.setFieldsValue(initialValues);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(computeGetPath(id));
      const entity = data?.data ?? data ?? null;
      if (!entity) {
        messageApi.error("Not found");
        return goToList();
      }
      const init = {};
      (fields || []).forEach((f) => {
        const val = deepGet(entity, f.name);
        init[Array.isArray(f.name) ? f.name : String(f.name)] =
          val !== undefined ? val : (f.input === "select" ? undefined : "");
      });
      form.setFieldsValue({ ...init, ...initialValues });
    } catch {
      messageApi.error("Failed to load");
      goToList();
    } finally {
      setLoading(false);
    }
  }, [isEdit, id, form, messageApi, fields, initialValues, goToList]);

  useEffect(() => { load(); }, [load]);

  // async select loaders
  const fieldKey = (f) => (Array.isArray(f.name) ? f.name.join(".") : String(f.name));

  const fetchOptionsFromUrl = async (f, q) => {
    const params = {
      ...(f.optionsParams || {}),
      ...(f.serverSearch && q ? { [f.searchParam || "q"]: q } : {}),
    };
    const res = await api.get(f.optionsUrl, { params });
    const raw = res?.data?.data ?? res?.data ?? [];
    if (typeof f.transform === "function") return raw.map(f.transform);
    const vKey = f.optionValue || "value";
    const lKey = f.optionLabel || "label";
    return raw.map((it) => ({ value: it[vKey], label: it[lKey] }));
  };

  const loadFieldOptions = useCallback(
    async (f, q) => {
      const key = fieldKey(f);
      try {
        setOptsLoading(key, true);
        let opts = [];
        if (typeof f.optionsLoader === "function") {
          opts = await f.optionsLoader(q);
        } else if (f.optionsUrl) {
          opts = await fetchOptionsFromUrl(f, q);
        } else if (Array.isArray(f.options)) {
          opts = f.options;
        }
        setOpts(key, opts);
      } catch {
        setOpts(key, []);
      } finally {
        setOptsLoading(key, false);
      }
    },
    []
  );

  useEffect(() => {
    (fields || []).forEach((f) => {
      const key = fieldKey(f);
      const needsAsync = f.optionsUrl || f.optionsLoader;
      const shouldAutoload = f.autoloadOptions !== false;
      if (needsAsync && shouldAutoload) {
        if (!selectOptions[key] || selectOptions[key].length === 0) {
          loadFieldOptions(f);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const debouncedServerSearch = (f, val) => {
    const key = fieldKey(f);
    if (searchTimers.current[key]) clearTimeout(searchTimers.current[key]);
    searchTimers.current[key] = setTimeout(() => {
      loadFieldOptions(f, val);
    }, 300);
  };

  // save
  const onFinish = useCallback(async (values) => {
    if (saving) return;
    setSaving(true);
    // Apply custom transform from caller if provided
    const payload = typeof transformSubmit === "function" ? transformSubmit(values) : values;

    try {
      if (isEdit) {
        const url = computeUpdatePath(id);
        console.debug("[EntityForm] update =>", url, payload);
        const res = await api.patch(url, payload).catch(() => api.put(url, payload));
        const updated = res?.data?.data ?? res?.data ?? { id, ...payload };

        // afterUpdate hook
        let hook = apiCfg.afterUpdate?.(res);
        messageApi.success("Saved");
        if (hook?.preventRedirect) return;

        return goToDetail(updated.id ?? id);
      }

      // CREATE
      const url = computeCreatePath();
      console.debug("[EntityForm] create =>", url, payload);
      const res = typeof apiCfg.create === "function"
        ? await apiCfg.create(api, payload)
        : await api.post(url, payload);

      const created = res?.data?.data ?? res?.data ?? {};

      // afterCreate hook
      let hook = apiCfg.afterCreate?.(res);
      messageApi.success("Created");
      if (hook?.preventRedirect) return;

      if (created?.id) return goToDetail(created.id);
      return goToList();
    } catch (err) {
      // bubble error nicely
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("[EntityForm] submit error", status, data, err);

      // Prefer backend message when available
      const backendMsg = data?.message || data?.error || data?.errors?.[0]?.message;
      messageApi.error(backendMsg ? String(backendMsg) : `Save failed${status ? ` (${status})` : ""}`);

      // notify caller if they want to handle
      try { apiCfg.onSubmitError?.(err); } catch {}

    } finally {
      setSaving(false);
    }
  }, [saving, isEdit, id, transformSubmit, apiCfg, messageApi, goToDetail, goToList]);

  const onFinishFailed = ({ errorFields }) => {
    if (errorFields?.length) {
      form.scrollToField(errorFields[0]?.name, { block: "center", behavior: "smooth" });
      messageApi.warning("Please fix the highlighted fields.");
    }
  };

  // field renderer
  const fieldKeyFn = (f) => (Array.isArray(f.name) ? f.name.join(".") : String(f.name));

  const renderField = (f) => {
    const key = fieldKeyFn(f);
    const inputType = f.input || "input";
    const labelNode = (
      <Space size={6}>
        <span>{f.label}</span>
        {f.help ? (
          <Tooltip title={f.help}>
            <QuestionCircleOutlined />
          </Tooltip>
        ) : null}
      </Space>
    );
    const common = {
      key,
      name: f.name,
      label: labelNode,
      rules: f.rules,
      extra: f.extra,
      required: Array.isArray(f.rules) && f.rules.some((r) => r?.required),
      valuePropName: f.valuePropName,
    };
    const sharedProps = {
      size: "middle",
      allowClear: true,
      placeholder: f.placeholder,
      ...(f.props || {}),
    };

    if (inputType === "number") {
      return (
        <Form.Item {...common}>
          <InputNumber style={{ width: "100%" }} {...sharedProps} />
        </Form.Item>
      );
    }

    if (inputType === "date") {
      return (
        <Form.Item {...common} getValueFromEvent={(v) => v}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" {...sharedProps} />
        </Form.Item>
      );
    }

    if (inputType === "geo") {
      const displayKey = f.mapTo?.label || f.name;
      const displayValue = Form.useWatch(displayKey, form);
      return (
        <Form.Item {...common}>
          <Input
            readOnly
            value={displayValue}
            placeholder={f.placeholder || "Set location"}
            suffix={
              <Tooltip title="Pick from map">
                <Button
                  type="text"
                  onClick={() => {
                    setGeoFieldCfg(f);
                    setGeoOpen(true);
                  }}
                  icon={<EnvironmentOutlined />}
                />
              </Tooltip>
            }
          />
        </Form.Item>
      );
    }

    if (inputType === "select") {
      const opts = Array.isArray(f.options) ? f.options : (selectOptions[key] || []);
      const loading = !!selectLoading[key];
      const isRemote = !!(f.optionsUrl || f.optionsLoader);
      return (
        <Form.Item {...common}>
          <Select
            options={opts}
            loading={loading}
            showSearch={!!(f.search || f.serverSearch)}
            optionFilterProp={f.search && !f.serverSearch ? "label" : undefined}
            filterOption={f.search && !f.serverSearch ? undefined : false}
            onSearch={f.serverSearch ? (val) => debouncedServerSearch(f, val) : undefined}
            onDropdownVisibleChange={(open) => {
              if (open && isRemote && (!opts || opts.length === 0)) {
                loadFieldOptions(f);
              }
            }}
            popupMatchSelectWidth={false}
            {...sharedProps}
          />
        </Form.Item>
      );
    }

    if (inputType === "textarea") {
      return (
        <Form.Item {...common}>
          <Input.TextArea rows={f.rows || 3} showCount={!!f.maxLength} maxLength={f.maxLength} {...sharedProps} />
        </Form.Item>
      );
    }

    if (inputType === "password") {
      return (
        <Form.Item {...common}>
          <Input.Password {...sharedProps} />
        </Form.Item>
      );
    }

    return (
      <Form.Item {...common}>
        <Input {...sharedProps} />
      </Form.Item>
    );
  };

  // layout groups
  const primary = useMemo(() => (fields || []).filter((f) => !f.advanced), [fields]);
  const advanced = useMemo(() => (fields || []).filter((f) => f.advanced), [fields]);

  // 🔸 single CTA label: default "Add"
  const ctaLabel = submitLabel || "Add";

  return (
    <div className="max-w-[980px] mx-auto px-3 md:px-4">
      {contextHolder}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Space wrap>
          {/* <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button> */}
          <div>
            <Title level={3} className="!mb-0">{isEdit ? titleEdit : titleNew}</Title>
          </div>
        </Space>
      </div>

      {/* Main Card */}
      <Card className="!rounded-2xl" loading={loading}>
        <Form
          form={form}
          layout={layoutMode === "lead" ? "horizontal" : "vertical"}
          size="middle"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          initialValues={{ date_added: dayjs(), ...initialValues }}
          disabled={saving}
          requiredMark={false}
          scrollToFirstError={{ behavior: "smooth" }}
          {...(layoutMode === "lead"
            ? { labelAlign: "left", labelCol: { flex: "180px" }, wrapperCol: { flex: "auto" } }
            : {})}
        >
          {layoutMode === "lead" ? (
            <>
              {primary.map(renderField)}

              {advanced.length > 0 && (
                <>
                  <div className="mt-1">
                    <Button
                      type="link"
                      icon={showMore ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => setShowMore((s) => !s)}
                    >
                      {showMore ? "Show fewer fields" : "Show more fields"}
                    </Button>
                  </div>
                  {showMore && (
                    <>
                      <Divider className="!my-3" />
                      {advanced.map(renderField)}
                    </>
                  )}
                </>
              )}

              {/* Single action row */}
              <div className="flex justify-end mt-2">
                <Space>
                  <Button onClick={goToList}>Cancel</Button>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    {ctaLabel}
                  </Button>
                </Space>
              </div>
            </>
          ) : (
            <>
              {primary.map(renderField)}
              {advanced.length > 0 && (
                <>
                  <Divider />
                  {advanced.map(renderField)}
                </>
              )}
              <Space>
                <Button onClick={goToList}>Cancel</Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                  {ctaLabel}
                </Button>
              </Space>
            </>
          )}
        </Form>
      </Card>

      {/* Sticky bar when dirty */}
      {isEdit && isDirty && !saving && (
        <Affix offsetBottom={12}>
          <Card className="!rounded-xl shadow-lg mt-3">
            <div className="flex items-center justify-between gap-3">
              <Text>Unsaved changes</Text>
              <Space>
                <Button onClick={goToList}>Discard</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>
                  {ctaLabel}
                </Button>
              </Space>
            </div>
          </Card>
        </Affix>
      )}

      {/* Map Picker Modal */}
      <MapPickerModal
        open={geoOpen}
        onCancel={() => setGeoOpen(false)}
        initial={{
          label: form.getFieldValue(geoFieldCfg?.mapTo?.label || geoFieldCfg?.name),
          lat: form.getFieldValue(geoFieldCfg?.mapTo?.lat),
          lng: form.getFieldValue(geoFieldCfg?.mapTo?.lng),
        }}
        onOk={({ label, lat, lng }) => {
          if (!geoFieldCfg) return setGeoOpen(false);
          const m = geoFieldCfg.mapTo || {};
          const updates = {};
          if (m.label) updates[m.label] = label;
          else if (typeof geoFieldCfg.name === "string") updates[geoFieldCfg.name] = label;
          if (m.lat) updates[m.lat] = lat;
          if (m.lng) updates[m.lng] = lng;
          form.setFieldsValue(updates);
          setGeoOpen(false);
        }}
      />
    </div>
  );
}

export const validators = {
  httpsUrlRule,
  emailReq: [{ required: true, message: "Email is required" }, { type: "email", message: "Enter a valid email" }],
  nameReq: [{ required: true, message: "Name is required" }],
};
