import React from "react";
import TaskCard from "./TaskCard";

export default function TaskList({ items = [], onOpen }) {
  return (
    <div className="grid gap-10 md:gap-4">
      {items.map((t) => (
        <TaskCard key={t.id} task={t} onOpen={onOpen} />
      ))}
    </div>
  );
}
