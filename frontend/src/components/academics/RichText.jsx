import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/** Stable Quill wrapper so typing doesn’t skip characters */
function RichText({ value, onChange, placeholder }) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "blockquote", "code-block"],
      ["clean"],
    ],
  }), []);

  const formats = useMemo(() => [
    "header", "bold", "italic", "underline", "strike",
    "color", "background", "list", "bullet", "link", "blockquote", "code-block",
  ], []);

  return (
    <div className="richtext">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        bounds=".richtext"
        preserveWhitespace
      />
      <style>{`
        .richtext .ql-container { min-height: 140px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
        .richtext .ql-toolbar { border-top-left-radius: 8px; border-top-right-radius: 8px; }
      `}</style>
    </div>
  );
}

export default React.memo(RichText);
