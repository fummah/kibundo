import React from "react";
import { Typography } from "antd";

export default function MoneyText({ amount, currency = "EUR", strong = true }) {
  const val =
    amount == null
      ? "—"
      : Number(amount).toLocaleString(undefined, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const T = strong ? Typography.Text : React.Fragment;
  return strong ? <Typography.Text strong>{val}</Typography.Text> : <>{val}</>;
}
