"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendEmailMessage } from "@/server/actions/messages";

export function EmailComposer({ applicationId }: { applicationId: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        setError(null);
        setSent(false);
        start(async () => {
          try {
            await sendEmailMessage({
              applicationId,
              subject: String(fd.get("subject") ?? ""),
              body: String(fd.get("body") ?? ""),
            });
            setSent(true);
            form.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="space-y-2"
    >
      <input name="subject" required placeholder={t("admin.subject")} className="input" />
      <textarea name="body" required rows={4} placeholder={t("admin.body")} className="input" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {sent && <p className="text-xs text-green-700">Sendt.</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? t("common.loading") : t("admin.sendEmail")}
      </button>
    </form>
  );
}
