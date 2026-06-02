"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireRecruiter() {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") throw new Error("Ikke autorisert");
  return session;
}

const createSetSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  jobId: z.string().optional(),
  questions: z
    .array(z.object({ text: z.string().min(1), weight: z.coerce.number().int().min(1).max(5).default(1) }))
    .min(1),
});

export async function createInterviewSet(input: z.infer<typeof createSetSchema>) {
  await requireRecruiter();
  const data = createSetSchema.parse(input);
  await prisma.interviewSet.create({
    data: {
      name: data.name,
      description: data.description,
      jobId: data.jobId,
      questions: {
        create: data.questions.map((q, i) => ({ text: q.text, weight: q.weight, order: i })),
      },
    },
  });
  revalidatePath("/admin/maler/intervjuer");
}

const scoreSchema = z.object({
  applicationId: z.string(),
  interviewSetId: z.string(),
  answers: z.record(z.string(), z.object({ score: z.coerce.number().min(1).max(5), note: z.string().default("") })),
});

export async function submitInterviewScore(input: z.infer<typeof scoreSchema>) {
  const session = await requireRecruiter();
  const data = scoreSchema.parse(input);
  const set = await prisma.interviewSet.findUnique({
    where: { id: data.interviewSetId },
    include: { questions: true },
  });
  if (!set) throw new Error("Intervjusett finnes ikke");

  let totalWeight = 0;
  let weightedScore = 0;
  for (const q of set.questions) {
    const ans = data.answers[q.id];
    if (!ans) continue;
    totalWeight += q.weight;
    weightedScore += ans.score * q.weight;
  }
  const overall = totalWeight > 0 ? weightedScore / totalWeight : 0;

  const app = await prisma.application.findUniqueOrThrow({ where: { id: data.applicationId } });
  await prisma.interviewScore.create({
    data: {
      applicationId: data.applicationId,
      interviewSetId: data.interviewSetId,
      interviewerId: session.user.id,
      answers: data.answers,
      overallScore: overall,
    },
  });
  revalidatePath(`/admin/kandidater/${app.candidateId}`);
}
