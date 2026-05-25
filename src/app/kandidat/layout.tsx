import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/server/auth";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const session = await auth();
  if (!session?.user) redirect("/logg-inn");
  if (session.user.role !== "CANDIDATE") redirect("/admin");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/kandidat" className="font-semibold">{t("common.appName")} — {t("candidate.dashboard")}</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/kandidat" className="hover:underline">{t("candidate.myApplications")}</Link>
            <Link href="/kandidat/profil" className="hover:underline">{t("candidate.profile")}</Link>
            <Link href="/jobb" className="hover:underline">{t("public.openPositions")}</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="btn-secondary text-sm">{t("auth.logout")}</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
