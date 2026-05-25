import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const session = await auth();
  if (!session?.user) redirect("/logg-inn");
  if (session.user.role === "CANDIDATE") redirect("/kandidat");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold">{t("common.appName")}</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/stillinger" className="hover:underline">{t("admin.jobs")}</Link>
              <Link href="/admin/kandidater" className="hover:underline">{t("admin.candidates")}</Link>
              <Link href="/admin/maler/e-post" className="hover:underline">{t("admin.emailTemplates")}</Link>
              <Link href="/admin/maler/intervjuer" className="hover:underline">{t("admin.interviewSets")}</Link>
              <Link href="/admin/oppgaver" className="hover:underline">{t("admin.tasks")}</Link>
            </nav>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="btn-secondary text-sm">{session.user.email} · {t("auth.logout")}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
