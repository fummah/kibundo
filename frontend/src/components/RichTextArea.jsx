// components/RichTextArea.jsx
import React, { forwardRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const RichTextArea = forwardRef(function RichTextArea(
  { value, onChange, placeholder = "Write something...", ...rest },
  ref
) {
  return (
    <ReactQuill
      ref={ref}                   // direct ref -> safe
      theme="snow"
      value={value || ""}
      onChange={(html) => onChange?.(html)}
      placeholder={placeholder}
      {...rest}
    />
  );
});

export default RichTextArea;
