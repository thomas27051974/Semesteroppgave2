"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { registerCandidate } from "@/server/actions/auth";

export function RegisterForm() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await registerCandidate({
              name: String(fd.get("name") ?? ""),
              email: String(fd.get("email") ?? ""),
              password: String(fd.get("password") ?? ""),
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="name">{t("common.name")}</label>
        <input id="name" name="name" required className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">{t("common.email")}</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("common.password")}</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        <p className="mt-1 text-xs text-slate-500">{t("auth.passwordMin")}</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t("common.loading") : t("auth.registerCta")}
      </button>
    </form>
  );
}
