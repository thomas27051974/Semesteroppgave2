"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        start(async () => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="email">{t("common.email")}</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("common.password")}</label>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t("common.loading") : t("auth.loginCta")}
      </button>
    </form>
  );
}
