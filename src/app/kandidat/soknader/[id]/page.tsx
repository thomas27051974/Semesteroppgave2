import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Thread } from "@/components/chat/Thread";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CandidateApplicationPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  const fmt = await getFormatter();
  const session = (await auth())!;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: true,
      currentStage: true,
      candidate: { include: { user: true } },
      transitions: { include: { toStage: true }, orderBy: { movedAt: "asc" } },
    },
  });
  if (!application) notFound();
  if (application.candidate.userId !== session.user.id) notFound();

  const chatThread = await prisma.messageThread.findUnique({
    where: { applicationId_channel: { applicationId: application.id, channel: "CHAT" } },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold">{application.job.title}</h1>
        <p className="text-sm text-slate-600">
          {t("candidate.appliedOn", { date: fmt.dateTime(application.appliedAt, { dateStyle: "long" }) })} · {t("candidate.stage")}: <span className="pill">{application.currentStage.name}</span>
        </p>
        <div className="card">
          <h2 className="font-semibold mb-3">{t("admin.timeline")}</h2>
          <ol className="space-y-2 text-sm">
            {application.transitions.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>{t.toStage.name}</span>
                <span className="text-slate-500">{fmt.dateTime(t.movedAt, { dateStyle: "medium" })}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="card">
        <h2 className="font-semibold mb-3">{t("candidate.messages")}</h2>
        <Thread
          applicationId={application.id}
          threadId={chatThread?.id ?? null}
          currentUserId={session.user.id}
          messages={
            chatThread?.messages.map((m) => ({
              id: m.id,
              body: m.body,
              direction: m.direction,
              authorUserId: m.authorUserId,
              sentAt: m.sentAt.toISOString(),
            })) ?? []
          }
          composerPlaceholder={t("candidate.writeMessage")}
        />
      </section>
    </div>
  );
}
