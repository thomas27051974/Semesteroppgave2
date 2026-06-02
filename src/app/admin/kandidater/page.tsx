import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CandidatesPage({ searchParams }: Props) {
  const t = await getTranslations();
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
          { tags: { has: q } },
        ],
      }
    : {};
  const candidates = await prisma.candidate.findMany({
    where,
    include: { user: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("admin.candidates")}</h1>
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder={t("common.search")} className="input max-w-md" />
      </form>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("common.name")}</th>
              <th className="px-4 py-3">{t("common.email")}</th>
              <th className="px-4 py-3">{t("admin.tags")}</th>
              <th className="px-4 py-3">Søknader</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Ingen kandidater.</td></tr>}
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/kandidater/${c.id}`} className="font-medium text-brand-600 hover:underline">{c.user.name}</Link>
                </td>
                <td className="px-4 py-3">{c.user.email}</td>
                <td className="px-4 py-3">{c.tags.map((t) => <span key={t} className="pill mr-1">{t}</span>)}</td>
                <td className="px-4 py-3">{c._count.applications}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
