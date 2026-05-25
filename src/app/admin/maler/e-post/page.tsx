import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { TemplateEditor } from "./TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const t = await getTranslations();
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("admin.emailTemplates")}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Variabler du kan bruke: <code>{`{{candidate.firstName}}`}</code>, <code>{`{{candidate.name}}`}</code>, <code>{`{{candidate.email}}`}</code>, <code>{`{{job.title}}`}</code>, <code>{`{{job.location}}`}</code>, <code>{`{{stage.name}}`}</code>.
      </p>
      <TemplateEditor
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          bodyMarkdown: t.bodyMarkdown,
        }))}
      />
    </div>
  );
}
