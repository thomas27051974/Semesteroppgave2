import { prisma } from "@/server/db";

export async function addTagAction(args: {
  applicationId: string;
  config: Record<string, unknown>;
}) {
  const tag = String(args.config.tag ?? "").trim();
  if (!tag) throw new Error("addTag: missing tag");

  const application = await prisma.application.findUnique({
    where: { id: args.applicationId },
    select: { candidateId: true },
  });
  if (!application) throw new Error("addTag: application not found");

  const candidate = await prisma.candidate.findUnique({
    where: { id: application.candidateId },
    select: { tags: true },
  });
  if (!candidate) return;
  if (candidate.tags.includes(tag)) return;

  await prisma.candidate.update({
    where: { id: application.candidateId },
    data: { tags: { set: [...candidate.tags, tag] } },
  });
}
