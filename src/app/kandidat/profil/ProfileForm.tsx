"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/server/actions/candidate";

type Initial = { name: string; phone: string; address: string; linkedinUrl: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setSaved(false);
        start(async () => {
          try {
            await updateProfile({
              name: String(fd.get("name") ?? ""),
              phone: String(fd.get("phone") ?? "") || undefined,
              address: String(fd.get("address") ?? "") || undefined,
              linkedinUrl: String(fd.get("linkedinUrl") ?? "") || undefined,
            });
            setSaved(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">{t("common.name")}</label>
        <input name="name" defaultValue={initial.name} required className="input" />
      </div>
      <div>
        <label className="label">{t("common.phone")}</label>
        <input name="phone" defaultValue={initial.phone} className="input" />
      </div>
      <div>
        <label className="label">{t("common.address")}</label>
        <input name="address" defaultValue={initial.address} className="input" />
      </div>
      <div>
        <label className="label">{t("candidate.linkedinUrl")}</label>
        <input name="linkedinUrl" type="url" defaultValue={initial.linkedinUrl} className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Lagret.</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? t("common.loading") : t("candidate.saveProfile")}
      </button>
    </form>
  );
}
