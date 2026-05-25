"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

async function requireRecruiter() {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") throw new Error("Ikke autorisert");
}

const baseSchema = z.object({
  pipelineId: z.string(),
  stageId: z.string(),
  event: z.enum(["ON_ENTER", "ON_EXIT"]),
});

const sendEmail = baseSchema.extend({
  actionType: z.literal("SEND_EMAIL"),
  templateId: z.string(),
});
const notifyUser = baseSchema.extend({
  actionType: z.literal("NOTIFY_USER"),
  userId: z.string(),
  message: z.string().default("Ny aktivitet"),
});
const createTask = baseSchema.extend({
  actionType: z.literal("CREATE_TASK"),
  assigneeUserId: z.string(),
  title: z.string(),
  dueInDays: z.coerce.number().int().min(0).max(60).default(3),
});
const addTag = baseSchema.extend({
  actionType: z.literal("ADD_TAG"),
  tag: z.string().min(1),
});

const schema = z.discriminatedUnion("actionType", [sendEmail, notifyUser, createTask, addTag]);

export async function createAutomation(input: z.infer<typeof schema>) {
  await requireRecruiter();
  const data = schema.parse(input);

  let config: Prisma.InputJsonValue;
  switch (data.actionType) {
    case "SEND_EMAIL":
      config = { templateId: data.templateId };
      break;
    case "NOTIFY_USER":
      config = { userId: data.userId, message: data.message };
      break;
    case "CREATE_TASK":
      config = { assigneeUserId: data.assigneeUserId, title: data.title, dueInDays: data.dueInDays };
      break;
    case "ADD_TAG":
      config = { tag: data.tag };
      break;
  }

  await prisma.automation.create({
    data: {
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      event: data.event,
      actionType: data.actionType,
      config,
    },
  });

  revalidatePath(`/admin/stillinger`);
}

export async function deleteAutomation(automationId: string) {
  await requireRecruiter();
  await prisma.automation.delete({ where: { id: automationId } });
  revalidatePath(`/admin/stillinger`);
}

export async function toggleAutomation(automationId: string, enabled: boolean) {
  await requireRecruiter();
  await prisma.automation.update({ where: { id: automationId }, data: { enabled } });
  revalidatePath(`/admin/stillinger`);
}
