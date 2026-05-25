"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

async function requireRecruiter() {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") {
    throw new Error("Ikke autorisert");
  }
  return session;
}

const createJobSchema = z.object({
  title: z.string().min(2),
  location: z.string().min(2),
  employmentType: z.string().default("Fast"),
  department: z.string().optional(),
  description: z.string().min(10),
});

export async function createJob(input: z.infer<typeof createJobSchema>) {
  await requireRecruiter();
  const data = createJobSchema.parse(input);

  const template = await prisma.pipeline.findFirst({
    where: { isTemplate: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!template) throw new Error("Mangler standard rekrutteringsprosess");

  const baseSlug = slugify(data.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.job.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      name: `${data.title} – prosess`,
      stages: { create: template.stages.map((s) => ({ name: s.name, order: s.order, type: s.type, slaDays: s.slaDays })) },
    },
  });

  const job = await prisma.job.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      location: data.location,
      employmentType: data.employmentType,
      department: data.department,
      pipelineId: pipeline.id,
    },
  });

  revalidatePath("/admin/stillinger");
  redirect(`/admin/stillinger/${job.id}`);
}

export async function publishJob(jobId: string) {
  await requireRecruiter();
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/admin/stillinger");
  revalidatePath("/jobb");
}

export async function closeJob(jobId: string) {
  await requireRecruiter();
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  revalidatePath("/admin/stillinger");
  revalidatePath("/jobb");
}

const updateDescSchema = z.object({ jobId: z.string(), description: z.string().min(1) });
export async function updateJobDescription(input: z.infer<typeof updateDescSchema>) {
  await requireRecruiter();
  const { jobId, description } = updateDescSchema.parse(input);
  await prisma.job.update({ where: { id: jobId }, data: { description } });
  revalidatePath(`/admin/stillinger/${jobId}`);
}
