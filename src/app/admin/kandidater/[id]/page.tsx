import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getFormatter } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Thread } from "@/components/chat/Thread";
import { EmailComposer } from "./EmailComposer";
import { ScoreCard } from "./ScoreCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CandidatePage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  const fmt = await getFormatter();
  const session = (await auth())!;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      user: true,
      resumes: { orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }] },
      applications: {
        include: {
          job: true,
          currentStage: true,
          transitions: { include: { toStage: true }, orderBy: { movedAt: "asc" } },
          scores: { include: { interviewSet: true } },
          threads: { include: { messages: { orderBy: { sentAt: "asc" } } } },
        },
        orderBy: { appliedAt: "desc" },
      },
    },
  });
  if (!candidate) notFound();

  const interviewSets = await prisma.interviewSet.findMany({
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <header className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{candidate.user.name}</h1>
            <p className="text-sm text-slate-600">{candidate.user.email}{candidate.phone && ` · ${candidate.phone}`}</p>
            <p className="mt-2 flex flex-wrap gap-1">
              {candidate.tags.map((tag) => <span key={tag} className="pill">{tag}</span>)}
            </p>
          </div>
          {candidate.linkedinUrl && (
            <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">LinkedIn &rarr;</a>
          )}
        </div>
        {candidate.resumes.length > 0 && (
          <div className="mt-4 text-sm">
            <strong>CV:</strong>{" "}
            {candidate.resumes.map((r) => (
              <span key={r.id} className="mr-3">{r.filename}{r.isPrimary && " (standard)"}</span>
            ))}
          </div>
        )}
      </header>

      {candidate.applications.map((app) => {
        const chatThread = app.threads.find((th) => th.channel === "CHAT");
        const emailThread = app.threads.find((th) => th.channel === "EMAIL");
        return (
          <section key={app.id} className="space-y-4">
            <h2 className="text-xl font-semibold">
              <Link href={`/admin/stillinger/${app.jobId}`} className="hover:underline">{app.job.title}</Link>
              <span className="ml-3 pill">{t("candidate.stage")}: {app.currentStage.name}</span>
            </h2>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card">
                <h3 className="font-semibold mb-2">{t("admin.timeline")}</h3>
                <ol className="space-y-2 text-sm">
                  {app.transitions.map((tr) => (
                    <li key={tr.id} className="flex items-center justify-between">
                      <span>{tr.toStage.name}</span>
                      <span className="text-slate-500">{fmt.dateTime(tr.movedAt, { dateStyle: "medium" })}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">Chat</h3>
                <Thread
                  applicationId={app.id}
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
                  composerPlaceholder={t("admin.sendChat")}
                />
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">{t("admin.sendEmail")}</h3>
                <EmailComposer applicationId={app.id} />
                {emailThread && emailThread.messages.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto text-sm">
                    {emailThread.messages.map((m) => (
                      <div key={m.id} className="rounded border border-slate-200 p-2">
                        <p className="text-xs text-slate-500">
                          {m.direction === "OUT" ? "Sendt" : "Mottatt"} · {fmt.dateTime(m.sentAt, { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">{t("admin.scorecard")}</h3>
              <div className="space-y-3">
                {app.scores.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {app.scores.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                        <span>{s.interviewSet.name}</span>
                        <span className="font-semibold">{s.overallScore.toFixed(2)} / 5</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ScoreCard
                  applicationId={app.id}
                  interviewSets={interviewSets.map((s) => ({
                    id: s.id,
                    name: s.name,
                    questions: s.questions.map((q) => ({ id: q.id, text: q.text, weight: q.weight })),
                  }))}
                />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
