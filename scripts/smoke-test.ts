import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.pipeline.findFirstOrThrow({
    where: { isTemplate: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  const slug = "test-utvikler";
  let job = await prisma.job.findUnique({ where: { slug } });
  if (!job) {
    const pipeline = await prisma.pipeline.create({
      data: {
        name: "Utvikler – prosess",
        stages: { create: template.stages.map((s) => ({ name: s.name, order: s.order, type: s.type })) },
      },
    });
    job = await prisma.job.create({
      data: {
        title: "Test-utvikler",
        slug,
        description:
          "Vi søker en dyktig utvikler til å bygge nye funksjoner i vår platform. Du vil jobbe med moderne TypeScript, Next.js og Postgres.",
        location: "Oslo",
        employmentType: "Fast",
        status: "PUBLISHED",
        publishedAt: new Date(),
        pipelineId: pipeline.id,
      },
    });
  }

  // Hook up a SEND_EMAIL automation on the first stage (ON_ENTER):
  const pipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: job.pipelineId },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  const firstStage = pipeline.stages[0];
  const template1 = await prisma.emailTemplate.findFirstOrThrow({ where: { name: "Takk for søknaden" } });

  const existing = await prisma.automation.findFirst({
    where: { stageId: firstStage.id, event: "ON_ENTER", actionType: "SEND_EMAIL" },
  });
  if (!existing) {
    await prisma.automation.create({
      data: {
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        event: "ON_ENTER",
        actionType: "SEND_EMAIL",
        config: { templateId: template1.id },
      },
    });
  }

  console.log(`Job ready: http://localhost:3000/jobb/${job.slug}`);
  console.log(`Admin job: http://localhost:3000/admin/stillinger/${job.id}`);
  console.log(`Kanban:    http://localhost:3000/admin/stillinger/${job.id}/kanban`);
}

main().finally(() => prisma.$disconnect());
