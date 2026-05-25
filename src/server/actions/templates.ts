"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireRecruiter() {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") throw new Error("Ikke autorisert");
}

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  subject: z.string().min(1),
  bodyMarkdown: z.string().min(1),
});

export async function upsertEmailTemplate(input: z.infer<typeof upsertSchema>) {
  await requireRecruiter();
  const data = upsertSchema.parse(input);
  if (data.id) {
    await prisma.emailTemplate.update({
      where: { id: data.id },
      data: { name: data.name, subject: data.subject, bodyMarkdown: data.bodyMarkdown },
    });
  } else {
    await prisma.emailTemplate.create({
      data: { name: data.name, subject: data.subject, bodyMarkdown: data.bodyMarkdown },
    });
  }
  revalidatePath("/admin/maler/e-post");
}

export async function deleteEmailTemplate(id: string) {
  await requireRecruiter();
  await prisma.emailTemplate.delete({ where: { id } });
  revalidatePath("/admin/maler/e-post");
}
