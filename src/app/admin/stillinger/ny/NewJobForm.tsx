"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { createJob } from "@/server/actions/jobs";

export function NewJobForm() {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await createJob({
              title: String(fd.get("title") ?? ""),
              location: String(fd.get("location") ?? ""),
              employmentType: String(fd.get("employmentType") ?? "Fast"),
              department: String(fd.get("department") ?? "") || undefined,
              description: String(fd.get("description") ?? ""),
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="card space-y-4"
    >
      <div>
        <label className="label">{t("common.title")}</label>
        <input name="title" required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">{t("public.location")}</label>
          <input name="location" required className="input" defaultValue="Oslo" />
        </div>
        <div>
          <label className="label">{t("public.employmentType")}</label>
          <select name="employmentType" className="input" defaultValue="Fast">
            <option>Fast</option>
            <option>Vikariat</option>
            <option>Engasjement</option>
            <option>Sommerjobb</option>
            <option>Lærling</option>
          </select>
        </div>
        <div>
          <label className="label">{t("public.department")}</label>
          <input name="department" className="input" />
        </div>
      </div>
      <div>
        <label className="label">{t("public.aboutRole")}</label>
        <textarea name="description" required rows={12} className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? t("common.loading") : t("admin.draftJob")}
      </button>
    </form>
  );
}
