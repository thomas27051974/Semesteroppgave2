import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations();
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold">{t("common.appName")}</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobb" className="hover:underline">{t("public.openPositions")}</Link>
            <Link href="/kandidat" className="hover:underline">{t("candidate.dashboard")}</Link>
            <Link href="/admin" className="btn-secondary">{t("admin.dashboard")}</Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("public.heroTitle")}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">{t("public.heroSubtitle")}</p>
        <div className="mt-10">
          <Link href="/jobb" className="btn-primary text-base">{t("public.openPositions")}</Link>
        </div>
      </section>
    </main>
  );
}
