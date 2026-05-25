"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { uploadBuffer } from "@/server/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireCandidate() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CANDIDATE") throw new Error("Ikke autorisert");
  return session;
}

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const session = await requireCandidate();
  const data = profileSchema.parse(input);
  await prisma.$transaction([
    prisma.user.update({ where: { id: session.user.id }, data: { name: data.name } }),
    prisma.candidate.update({
      where: { userId: session.user.id },
      data: {
        phone: data.phone ?? null,
        address: data.address ?? null,
        linkedinUrl: data.linkedinUrl || null,
      },
    }),
  ]);
  revalidatePath("/kandidat");
}

export async function uploadResume(formData: FormData) {
  const session = await requireCandidate();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Fil mangler");
  if (file.size > 10 * 1024 * 1024) throw new Error("Filen er for stor (maks 10 MB)");
  const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type)) throw new Error("Kun PDF eller DOCX er tillatt");

  const buf = Buffer.from(await file.arrayBuffer());
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: session.user.id } });
  const { url } = await uploadBuffer({
    container: process.env.BLOB_RESUMES_CONTAINER ?? "resumes",
    filename: file.name,
    data: buf,
    contentType: file.type,
  });
  const existing = await prisma.resume.count({ where: { candidateId: candidate.id } });
  await prisma.resume.create({
    data: {
      candidateId: candidate.id,
      filename: file.name,
      blobUrl: url,
      sizeBytes: file.size,
      isPrimary: existing === 0,
    },
  });
  revalidatePath("/kandidat");
}

export async function setPrimaryResume(resumeId: string) {
  const session = await requireCandidate();
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: session.user.id } });
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.candidateId !== candidate.id) throw new Error("Ikke autorisert");
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { candidateId: candidate.id }, data: { isPrimary: false } }),
    prisma.resume.update({ where: { id: resumeId }, data: { isPrimary: true } }),
  ]);
  revalidatePath("/kandidat");
}

export async function deleteResume(resumeId: string) {
  const session = await requireCandidate();
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { userId: session.user.id } });
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.candidateId !== candidate.id) throw new Error("Ikke autorisert");
  await prisma.resume.delete({ where: { id: resumeId } });
  revalidatePath("/kandidat");
}
