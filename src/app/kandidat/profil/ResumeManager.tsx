"use client";

import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { uploadResume, setPrimaryResume, deleteResume } from "@/server/actions/candidate";

type Resume = { id: string; filename: string; isPrimary: boolean };

export function ResumeManager({ resumes }: { resumes: Resume[] }) {
  const t = useTranslations();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {resumes.length === 0 && <li className="text-sm text-slate-500">Ingen CV-er lastet opp ennå.</li>}
        {resumes.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
            <span className="text-sm">
              {r.filename} {r.isPrimary && <span className="pill ml-2">{t("candidate.primaryResume")}</span>}
            </span>
            <span className="flex gap-2">
              {!r.isPrimary && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => start(() => setPrimaryResume(r.id))}
                  disabled={pending}
                >
                  {t("candidate.setPrimary")}
                </button>
              )}
              <button
                className="btn-danger text-xs"
                onClick={() => start(() => deleteResume(r.id))}
                disabled={pending}
              >
                {t("common.delete")}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            await uploadResume(fd);
            if (fileInput.current) fileInput.current.value = "";
          });
        }}
        className="flex items-center gap-2"
      >
        <input ref={fileInput} type="file" name="file" required accept=".pdf,.docx" className="input" />
        <button className="btn-primary" disabled={pending}>{t("candidate.uploadNewResume")}</button>
      </form>
    </div>
  );
}
