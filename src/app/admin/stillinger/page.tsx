import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function JobsAdminPage() {
  const t = await getTranslations();
  const jobs = await prisma.job.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.jobs")}</h1>
        <Link href="/admin/stillinger/ny" className="btn-primary">{t("admin.newJob")}</Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("common.title")}</th>
              <th className="px-4 py-3">{t("public.location")}</th>
              <th className="px-4 py-3">{t("common.status")}</th>
              <th className="px-4 py-3">Søknader</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Ingen stillinger ennå.</td></tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-3 font-medium">{j.title}</td>
                <td className="px-4 py-3">{j.location}</td>
                <td className="px-4 py-3"><span className="pill">{t(`jobStatus.${j.status}`)}</span></td>
                <td className="px-4 py-3">{j._count.applications}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/stillinger/${j.id}`} className="text-brand-600 hover:underline">{t("common.edit")}</Link>
                  {" · "}
                  <Link href={`/admin/stillinger/${j.id}/kanban`} className="text-brand-600 hover:underline">{t("admin.kanban")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
