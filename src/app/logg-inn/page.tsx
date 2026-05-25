import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-6">{t("auth.loginTitle")}</h1>
        <LoginForm />
        <p className="mt-6 text-sm text-slate-600">
          {t("auth.noAccount")} <Link href="/kandidat/registrer" className="text-brand-600 hover:underline">{t("auth.register")}</Link>
        </p>
      </div>
    </main>
  );
}
