"use server";

import { prisma } from "@/server/db";
import { auth, hashPassword } from "@/server/auth";
import { enqueueAutomationsForTransition } from "@/server/queue";
import { runAutomationsForTransition } from "@/server/automations/engine";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";

export async function moveApplication(applicationId: string, toStageId: string) {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") {
    throw new Error("Ikke autorisert");
  }
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("Søknad finnes ikke");
  if (app.currentStageId === toStageId) return;

  const transition = await prisma.$transaction(async (tx) => {
    const t = await tx.stageTransition.create({
      data: {
        applicationId: app.id,
        fromStageId: app.currentStageId,
        toStageId,
        movedByUserId: session.user.id,
      },
    });
    await tx.application.update({
      where: { id: app.id },
      data: { currentStageId: toStageId },
    });
    return t;
  });

  // Best-effort: enqueue for the worker; if pg-boss isn't configured, run synchronously.
  try {
    await enqueueAutomationsForTransition(transition.id);
  } catch {
    await runAutomationsForTransition(transition.id);
  }

  revalidatePath(`/admin/stillinger/${app.jobId}/kanban`);
  revalidatePath(`/admin/kandidater/${app.candidateId}`);
}

const applySchema = z.object({
  jobId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  coverLetter: z.string().optional(),
});

export async function submitApplication(input: z.infer<typeof applySchema>) {
  const data = applySchema.parse(input);
  const email = data.email.toLowerCase();

  const job = await prisma.job.findUnique({
    where: { id: data.jobId },
    include: { pipeline: { include: { stages: { orderBy: { order: "asc" }, take: 1 } } } },
  });
  if (!job || job.status !== "PUBLISHED") throw new Error("Stilling er ikke åpen");
  const firstStage = job.pipeline.stages[0];
  if (!firstStage) throw new Error("Rekrutteringsprosess mangler steg");

  let user = await prisma.user.findUnique({ where: { email } });
  let tempPasswordPlain: string | null = null;
  if (!user) {
    tempPasswordPlain = randomBytes(9).toString("base64url");
    user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        role: "CANDIDATE",
        passwordHash: await hashPassword(tempPasswordPlain),
        candidate: { create: { phone: data.phone } },
      },
    });
  } else if (user.role !== "CANDIDATE") {
    throw new Error("Denne e-posten tilhører en ansatt-konto");
  } else {
    await prisma.candidate.upsert({
      where: { userId: user.id },
      create: { userId: user.id, phone: data.phone },
      update: { phone: data.phone ?? undefined },
    });
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: user.id } });

  const existing = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
  });
  if (existing) {
    return { status: "duplicate" as const, tempPassword: null };
  }

  const created = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobId: job.id,
      currentStageId: firstStage.id,
      coverLetter: data.coverLetter,
    },
  });

  const transition = await prisma.stageTransition.create({
    data: { applicationId: created.id, toStageId: firstStage.id, reason: "Søknad innsendt" },
  });

  try {
    await enqueueAutomationsForTransition(transition.id);
  } catch {
    await runAutomationsForTransition(transition.id);
  }

  return { status: "ok" as const, tempPassword: tempPasswordPlain };
}
