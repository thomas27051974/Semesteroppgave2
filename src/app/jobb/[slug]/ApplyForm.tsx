"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitApplication } from "@/server/actions/applications";

export function ApplyForm({ jobId }: { jobId: string }) {
  const t = useTranslations();
  const [done, setDone] = useState<{ tempPassword: string | null } | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-900">
        <p>{t("public.applySubmitted")}</p>
        {done.tempPassword && (
          <p className="mt-2">
            Vi har opprettet en konto for deg. Midlertidig passord: <code className="rounded bg-white px-2 py-1">{done.tempPassword}</code> —
            logg inn på <a href="/logg-inn" className="underline">/logg-inn</a> for å fortsette.
          </p>
        )}
      </div>
    );
  }
  if (duplicate) {
    return <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">{t("public.alreadyApplied")}</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const res = await submitApplication({
              jobId,
              name: String(fd.get("name") ?? ""),
              email: String(fd.get("email") ?? ""),
              phone: String(fd.get("phone") ?? "") || undefined,
              coverLetter: String(fd.get("coverLetter") ?? "") || undefined,
            });
            if (res.status === "duplicate") setDuplicate(true);
            else setDone({ tempPassword: res.tempPassword });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="name">{t("common.name")}</label>
        <input id="name" name="name" required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">{t("common.email")}</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">{t("common.phone")}</label>
          <input id="phone" name="phone" type="tel" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="coverLetter">{t("public.coverLetter")}</label>
        <textarea id="coverLetter" name="coverLetter" rows={6} className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t("common.loading") : t("common.submit")}
      </button>
    </form>
  );
}
