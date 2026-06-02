import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function JobsListPage() {
  const t = await getTranslations();
  const jobs = await prisma.job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="text-sm text-brand-600 hover:underline">&larr; {t("common.back")}</Link>
      <h1 className="mt-4 text-3xl font-bold">{t("public.openPositions")}</h1>
      {jobs.length === 0 ? (
        <p className="mt-8 text-slate-600">{t("public.noPositions")}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="card hover:border-brand-300">
              <Link href={`/jobb/${job.slug}`} className="block">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{job.title}</h2>
                    <p className="text-sm text-slate-600">
                      {job.location} · {job.employmentType}
                      {job.department ? ` · ${job.department}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-brand-600">{t("public.applyNow")} &rarr;</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
