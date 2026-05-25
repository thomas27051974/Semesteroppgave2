import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { runAutomationsForTransition } from "../src/server/automations/engine";

const prisma = new PrismaClient();

async function main() {
  const job = await prisma.job.findUniqueOrThrow({
    where: { slug: "test-utvikler" },
    include: { pipeline: { include: { stages: { orderBy: { order: "asc" } } } } },
  });
  const firstStage = job.pipeline.stages[0];

  const email = `kari+${Date.now()}@example.com`;
  const password = randomBytes(9).toString("base64url");
  const user = await prisma.user.create({
    data: {
      email,
      name: "Kari Nordmann",
      role: "CANDIDATE",
      passwordHash: await bcrypt.hash(password, 10),
      candidate: { create: { phone: "99887766" } },
    },
    include: { candidate: true },
  });
  console.log(`Created candidate ${user.email}`);

  const app = await prisma.application.create({
    data: {
      candidateId: user.candidate!.id,
      jobId: job.id,
      currentStageId: firstStage.id,
      coverLetter: "Jeg er svært interessert i denne stillingen.",
    },
  });
  const transition = await prisma.stageTransition.create({
    data: { applicationId: app.id, toStageId: firstStage.id, reason: "Søknad innsendt" },
  });
  console.log(`Created application + initial transition ${transition.id}`);

  await runAutomationsForTransition(transition.id);

  const runs = await prisma.automationRun.findMany({
    where: { transitionId: transition.id },
    include: { automation: true },
  });
  console.log(`\nAutomation runs (${runs.length}):`);
  for (const r of runs) {
    console.log(`  - ${r.automation.actionType} → ${r.success ? "OK" : `FAIL: ${r.errorMessage}`}`);
  }

  // Move to next stage to test ON_EXIT + ON_ENTER chain.
  const secondStage = job.pipeline.stages[1];
  const t2 = await prisma.stageTransition.create({
    data: { applicationId: app.id, fromStageId: firstStage.id, toStageId: secondStage.id },
  });
  await prisma.application.update({ where: { id: app.id }, data: { currentStageId: secondStage.id } });
  await runAutomationsForTransition(t2.id);
  console.log(`\nMoved to stage: ${secondStage.name}`);

  const threads = await prisma.messageThread.findMany({
    where: { applicationId: app.id },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  console.log(`\nThreads (${threads.length}):`);
  for (const th of threads) {
    console.log(`  ${th.channel}: ${th.messages.length} messages`);
    for (const m of th.messages) {
      const preview = m.body.split("\n")[0].slice(0, 90);
      console.log(`    [${m.direction}] ${preview}`);
    }
  }

  // Idempotency check: re-run should not double-execute.
  await runAutomationsForTransition(transition.id);
  const runs2 = await prisma.automationRun.findMany({ where: { transitionId: transition.id } });
  console.log(`\nIdempotency check — runs after re-execute: ${runs2.length} (should equal ${runs.length})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
