import { prisma } from "@/server/db";

export async function notifyUserAction(args: {
  applicationId: string;
  config: Record<string, unknown>;
}) {
  const userId = String(args.config.userId ?? "");
  const message = String(args.config.message ?? "Ny aktivitet på en kandidat");
  if (!userId) throw new Error("notifyUser: missing userId");

  const application = await prisma.application.findUnique({
    where: { id: args.applicationId },
    include: { job: true, candidate: { include: { user: true } } },
  });
  if (!application) throw new Error("notifyUser: application not found");

  await prisma.notification.create({
    data: {
      userId,
      title: `${application.candidate.user.name} — ${application.job.title}`,
      body: message,
      link: `/admin/kandidater/${application.candidateId}`,
    },
  });
}
