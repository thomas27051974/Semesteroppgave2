import { prisma } from "@/server/db";
import type { Automation, AutomationEvent, StageTransition } from "@prisma/client";
import { sendEmailAction } from "./handlers/sendEmail";
import { notifyUserAction } from "./handlers/notifyUser";
import { createTaskAction } from "./handlers/createTask";
import { addTagAction } from "./handlers/addTag";

export type AutomationContext = {
  transition: StageTransition;
  applicationId: string;
};

const handlers = {
  SEND_EMAIL: sendEmailAction,
  NOTIFY_USER: notifyUserAction,
  CREATE_TASK: createTaskAction,
  ADD_TAG: addTagAction,
} as const;

export async function runAutomationsForTransition(transitionId: string): Promise<void> {
  const transition = await prisma.stageTransition.findUnique({ where: { id: transitionId } });
  if (!transition) return;

  const events: AutomationEvent[] = [];
  if (transition.fromStageId) events.push("ON_EXIT");
  events.push("ON_ENTER");

  for (const event of events) {
    const stageId = event === "ON_EXIT" ? transition.fromStageId! : transition.toStageId;
    const automations = await prisma.automation.findMany({
      where: { stageId, event, enabled: true },
    });
    for (const automation of automations) {
      await runOne(automation, transition);
    }
  }
}

async function runOne(automation: Automation, transition: StageTransition) {
  // Idempotency: skip if already ran for this (automation, transition) pair.
  const existing = await prisma.automationRun.findUnique({
    where: { automationId_transitionId: { automationId: automation.id, transitionId: transition.id } },
  });
  if (existing) return;

  try {
    const handler = handlers[automation.actionType];
    await handler({
      applicationId: transition.applicationId,
      config: automation.config as Record<string, unknown>,
    });
    await prisma.automationRun.create({
      data: { automationId: automation.id, transitionId: transition.id, success: true },
    });
  } catch (err) {
    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        transitionId: transition.id,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
