import { Button } from "antd";

export default function CTAButton({ className="", ...props }) {
  return (
    <Button
      type="primary"
      className={`rounded-full !bg-[var(--kib-primary)] !border-none !h-[52px] font-semibold ${className}`}
      {...props}
    />
  );
}
