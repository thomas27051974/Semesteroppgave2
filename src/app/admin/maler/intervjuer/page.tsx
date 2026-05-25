import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { InterviewSetEditor } from "./InterviewSetEditor";

export const dynamic = "force-dynamic";

export default async function InterviewSetsPage() {
  const t = await getTranslations();
  const sets = await prisma.interviewSet.findMany({
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.interviewSets")}</h1>
      <ul className="space-y-2">
        {sets.map((s) => (
          <li key={s.id} className="card">
            <h2 className="font-semibold">{s.name}</h2>
            {s.description && <p className="text-sm text-slate-600">{s.description}</p>}
            <ol className="mt-2 list-decimal pl-5 text-sm">
              {s.questions.map((q) => <li key={q.id}>{q.text} <span className="text-xs text-slate-500">(vekt {q.weight})</span></li>)}
            </ol>
          </li>
        ))}
      </ul>
      <InterviewSetEditor />
    </div>
  );
}
