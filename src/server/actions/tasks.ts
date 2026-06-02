"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";

export async function completeTask(taskId: string) {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") throw new Error("Ikke autorisert");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.assigneeUserId !== session.user.id) throw new Error("Ikke autorisert");
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "DONE", completedAt: new Date() },
  });
  revalidatePath("/admin/oppgaver");
}
