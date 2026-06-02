import Link from "next/link";
import { getTranslations, getFormatter } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function CandidateHome() {
  const t = await getTranslations();
  const fmt = await getFormatter();
  const session = (await auth())!;
  const candidate = await prisma.candidate.findUnique({
    where: { userId: session.user.id },
    include: {
      applications: {
        include: { job: true, currentStage: true },
        orderBy: { appliedAt: "desc" },
      },
      resumes: { orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }] },
    },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">{t("candidate.myApplications")}</h1>
        {!candidate || candidate.applications.length === 0 ? (
          <p className="mt-4 text-slate-600">{t("candidate.noApplications")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {candidate.applications.map((app) => (
              <li key={app.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/kandidat/soknader/${app.id}`} className="text-lg font-semibold hover:underline">
                      {app.job.title}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {t("candidate.appliedOn", { date: fmt.dateTime(app.appliedAt, { dateStyle: "long" }) })}
                    </p>
                  </div>
                  <span className="pill">{t("candidate.stage")}: {app.currentStage.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
