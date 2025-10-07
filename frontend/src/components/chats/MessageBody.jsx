// src/components/chat/MessageBody.jsx
import React from "react";

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

function RenderQAList({ qa = [] }) {
  if (!Array.isArray(qa) || !qa.length) return null;
  return (
    <ol className="space-y-2 list-decimal pl-5">
      {qa.map((item, i) => {
        let q = isPlainObject(item) ? (item.question ?? item.q ?? "") : String(item ?? "");
        let a = isPlainObject(item) ? (item.answer ?? item.a ?? "") : "";
        return (
          <li key={i} className="bg-[#f7faf9] rounded-md p-2">
            {q && <div className="font-semibold text-[#2b6a5b] mb-1">{q}</div>}
            {a && <div className="text-[#41524f]">{a}</div>}
          </li>
        );
      })}
    </ol>
  );
}

export function MessageBody({ content }) {
  if (content == null) return null;

  if (typeof content === "string" || typeof content === "number" || typeof content === "boolean") {
    return <span>{String(content)}</span>;
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-1">
        {content.map((c, i) => (
          <div key={i}>
            <MessageBody content={c} />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(content)) {
    const { extractedText, qa, analysisText, rows, scanId } = content;

    // OCR / QA message
    if (extractedText || qa) {
      return (
        <div className="space-y-3">
          {extractedText && (
            <div>
              <div className="text-xs uppercase text-[#6c837e] mb-1">Extracted Text</div>
              <pre className="whitespace-pre-wrap bg-[#eef5f2] rounded-md p-2 text-[#2b2b2b] text-sm">
                {extractedText}
              </pre>
            </div>
          )}
          {qa?.length > 0 && (
            <div>
              <div className="text-xs uppercase text-[#6c837e] mb-1">Q&A</div>
              <RenderQAList qa={qa} />
            </div>
          )}
        </div>
      );
    }

    // Analysis message
    if (analysisText || rows) {
      return (
        <div className="space-y-3">
          {analysisText && (
            <pre className="whitespace-pre-wrap bg-[#eef5f2] rounded-md p-2 text-[#2b2b2b] text-sm">
              {analysisText}
            </pre>
          )}
          {Array.isArray(rows) && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-[#41524f]">
              {rows.map((r, i) => (
                <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
              ))}
            </ul>
          )}
          {scanId && <div className="text-xs text-[#6c837e]">Scan ID: {String(scanId)}</div>}
        </div>
      );
    }

    // Fallback
    return (
      <pre className="whitespace-pre-wrap bg-[#f5f7f6] rounded-md p-2 text-[#2b2b2b] text-sm">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }

  return <span>{String(content)}</span>;
}
