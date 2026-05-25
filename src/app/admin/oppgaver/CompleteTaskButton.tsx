"use client";

import { useTransition } from "react";
import { completeTask } from "@/server/actions/tasks";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-primary" disabled={pending} onClick={() => start(() => completeTask(taskId))}>
      Fullfør
    </button>
  );
}
