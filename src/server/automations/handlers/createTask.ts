import { prisma } from "@/server/db";

export async function createTaskAction(args: {
  applicationId: string;
  config: Record<string, unknown>;
}) {
  const assigneeUserId = String(args.config.assigneeUserId ?? "");
  const title = String(args.config.title ?? "Oppfølging av kandidat");
  const dueInDays = Number(args.config.dueInDays ?? 3);
  if (!assigneeUserId) throw new Error("createTask: missing assigneeUserId");

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + dueInDays);

  await prisma.task.create({
    data: {
      applicationId: args.applicationId,
      assigneeUserId,
      title,
      dueAt,
      createdByAutomation: true,
    },
  });
}
