import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Board } from "@/components/kanban/Board";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function KanbanPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
      applications: {
        include: {
          candidate: { include: { user: true } },
        },
      },
    },
  });
  if (!job) notFound();

  const columns = job.pipeline.stages.map((stage) => ({
    id: stage.id,
    title: stage.name,
    type: stage.type,
    cards: job.applications
      .filter((a) => a.currentStageId === stage.id)
      .map((a) => ({
        id: a.id,
        candidateName: a.candidate.user.name,
        candidateId: a.candidate.id,
        appliedAt: a.appliedAt.toISOString(),
      })),
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm"><Link href={`/admin/stillinger/${job.id}`} className="text-brand-600 hover:underline">&larr; {job.title}</Link></p>
          <h1 className="text-2xl font-bold">{t("admin.kanban")} — {job.title}</h1>
        </div>
      </header>
      <Board columns={columns} />
    </div>
  );
}
