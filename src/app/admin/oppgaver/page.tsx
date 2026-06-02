import Link from "next/link";
import { getTranslations, getFormatter } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { CompleteTaskButton } from "./CompleteTaskButton";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const t = await getTranslations();
  const fmt = await getFormatter();
  const session = (await auth())!;
  const tasks = await prisma.task.findMany({
    where: { assigneeUserId: session.user.id, status: "OPEN" },
    include: { application: { include: { candidate: { include: { user: true } }, job: true } } },
    orderBy: [{ dueAt: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("admin.tasks")}</h1>
      <ul className="space-y-2">
        {tasks.length === 0 && <p className="text-slate-500">Ingen åpne oppgaver.</p>}
        {tasks.map((task) => (
          <li key={task.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{task.title}</p>
              {task.application && (
                <p className="text-sm text-slate-600">
                  <Link href={`/admin/kandidater/${task.application.candidate.id}`} className="hover:underline">
                    {task.application.candidate.user.name}
                  </Link>{" "}
                  · {task.application.job.title}
                </p>
              )}
              {task.dueAt && (
                <p className="text-xs text-slate-500">Frist: {fmt.dateTime(task.dueAt, { dateStyle: "medium" })}</p>
              )}
            </div>
            <CompleteTaskButton taskId={task.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
