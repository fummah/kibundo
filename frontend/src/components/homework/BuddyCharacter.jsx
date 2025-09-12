import React from "react";

export default function BuddyCharacter({ text }) {
  return (
    <div className="flex gap-2">
      <div className="ml-auto max-w-[82%] bg-[#d6f3c9] text-[#245a2b] rounded-2xl px-3 py-2 shadow
                      relative">
        <div className="text-sm leading-snug">{text}</div>
        <div className="absolute -right-6 bottom-0 translate-y-1">
          <img src="/buddy-mini.png" alt="" className="w-6 h-6" onError={(e)=> (e.currentTarget.style.display='none')} />
        </div>
      </div>
    </div>
  );
}
