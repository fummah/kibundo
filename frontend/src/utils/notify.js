// src/utils/notify.js
import { App } from "antd";
let apiFromProvider = null;
export const setMessageApi = (api) => { apiFromProvider = api; };
export const notify = {
  success: (t) => apiFromProvider?.success?.(t),
  error:   (t) => apiFromProvider?.error?.(t),
  info:    (t) => apiFromProvider?.info?.(t),
};
