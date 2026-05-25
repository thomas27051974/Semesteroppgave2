import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-6">{t("auth.registerTitle")}</h1>
        <RegisterForm />
        <p className="mt-6 text-sm text-slate-600">
          {t("auth.haveAccount")} <Link href="/logg-inn" className="text-brand-600 hover:underline">{t("auth.loginCta")}</Link>
        </p>
      </div>
    </main>
  );
}
