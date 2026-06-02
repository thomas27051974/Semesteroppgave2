import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations();
  const job = await prisma.job.findUnique({ where: { slug } });
  if (!job || job.status !== "PUBLISHED") notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/jobb" className="text-sm text-brand-600 hover:underline">&larr; {t("public.openPositions")}</Link>
      <h1 className="mt-4 text-3xl font-bold">{job.title}</h1>
      <p className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
        <span className="pill">{job.location}</span>
        <span className="pill">{job.employmentType}</span>
        {job.department && <span className="pill">{job.department}</span>}
      </p>
      <article className="prose prose-slate mt-8 max-w-none whitespace-pre-wrap">
        {job.description}
      </article>
      <section className="mt-12 card">
        <h2 className="text-xl font-semibold mb-4">{t("public.applyTitle")}</h2>
        <ApplyForm jobId={job.id} />
      </section>
    </main>
  );
}
