import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { publishJob, closeJob, updateJobDescription } from "@/server/actions/jobs";
import { AutomationsEditor } from "./AutomationsEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function JobEditPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      pipeline: {
        include: {
          stages: { orderBy: { order: "asc" } },
          automations: true,
        },
      },
    },
  });
  if (!job) notFound();

  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  const recruiters = await prisma.user.findMany({
    where: { role: { in: ["RECRUITER", "ADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500"><Link href="/admin/stillinger" className="hover:underline">&larr; {t("admin.jobs")}</Link></p>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="pill">{t(`jobStatus.${job.status}`)}</span>{" "}
            {job.status === "PUBLISHED" && (
              <Link href={`/jobb/${job.slug}`} className="ml-2 text-brand-600 hover:underline">/jobb/{job.slug}</Link>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/stillinger/${job.id}/kanban`} className="btn-secondary">{t("admin.kanban")}</Link>
          {job.status === "DRAFT" && (
            <form action={async () => { "use server"; await publishJob(job.id); }}>
              <button className="btn-primary">{t("admin.publishJob")}</button>
            </form>
          )}
          {job.status === "PUBLISHED" && (
            <form action={async () => { "use server"; await closeJob(job.id); }}>
              <button className="btn-danger">{t("admin.closeJob")}</button>
            </form>
          )}
        </div>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-3">{t("public.aboutRole")}</h2>
        <form
          action={async (fd) => {
            "use server";
            await updateJobDescription({ jobId: job.id, description: String(fd.get("description") ?? "") });
          }}
          className="space-y-3"
        >
          <textarea name="description" rows={14} className="input" defaultValue={job.description} />
          <button className="btn-primary">{t("common.save")}</button>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">{t("admin.pipeline")}</h2>
        <ol className="space-y-1 text-sm">
          {job.pipeline.stages.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span>{s.order + 1}. {s.name}</span>
              <span className="pill">{t(`stageTypes.${s.type}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">{t("admin.automations")}</h2>
        <AutomationsEditor
          pipelineId={job.pipeline.id}
          stages={job.pipeline.stages.map((s) => ({ id: s.id, name: s.name }))}
          automations={job.pipeline.automations.map((a) => ({
            id: a.id,
            stageId: a.stageId,
            event: a.event,
            actionType: a.actionType,
            enabled: a.enabled,
            config: a.config as Record<string, unknown>,
          }))}
          emailTemplates={templates.map((t) => ({ id: t.id, name: t.name }))}
          recruiters={recruiters}
        />
      </section>
    </div>
  );
}
