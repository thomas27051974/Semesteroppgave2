"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { upsertEmailTemplate, deleteEmailTemplate } from "@/server/actions/templates";

type Template = { id: string; name: string; subject: string; bodyMarkdown: string };

export function TemplateEditor({ templates }: { templates: Template[] }) {
  const t = useTranslations();
  const [editing, setEditing] = useState<Template | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">Maler</h2>
        <ul className="space-y-1 text-sm">
          {templates.map((tpl) => (
            <li key={tpl.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
              <button onClick={() => setEditing(tpl)} className="text-left hover:underline">{tpl.name}</button>
              <button
                className="text-xs text-red-600 hover:underline"
                disabled={pending}
                onClick={() => start(() => deleteEmailTemplate(tpl.id))}
              >
                {t("common.delete")}
              </button>
            </li>
          ))}
        </ul>
        <button className="btn-secondary" onClick={() => setEditing({ id: "", name: "", subject: "", bodyMarkdown: "" })}>
          Ny mal
        </button>
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await upsertEmailTemplate({
                id: editing.id || undefined,
                name: String(fd.get("name") ?? ""),
                subject: String(fd.get("subject") ?? ""),
                bodyMarkdown: String(fd.get("bodyMarkdown") ?? ""),
              });
              setEditing(null);
            });
          }}
          className="card space-y-3"
        >
          <h2 className="font-semibold">{editing.id ? t("common.edit") : t("common.create")}</h2>
          <div>
            <label className="label">{t("common.name")}</label>
            <input name="name" defaultValue={editing.name} required className="input" />
          </div>
          <div>
            <label className="label">{t("admin.subject")}</label>
            <input name="subject" defaultValue={editing.subject} required className="input" />
          </div>
          <div>
            <label className="label">{t("admin.body")}</label>
            <textarea name="bodyMarkdown" defaultValue={editing.bodyMarkdown} required rows={12} className="input" />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={pending}>{t("common.save")}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
