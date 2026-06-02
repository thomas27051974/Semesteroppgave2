import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { ProfileForm } from "./ProfileForm";
import { ResumeManager } from "./ResumeManager";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getTranslations();
  const session = (await auth())!;
  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { userId: session.user.id },
    include: { user: true, resumes: { orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }] } },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card">
        <h1 className="text-xl font-semibold mb-4">{t("candidate.profile")}</h1>
        <ProfileForm
          initial={{
            name: candidate.user.name,
            phone: candidate.phone ?? "",
            address: candidate.address ?? "",
            linkedinUrl: candidate.linkedinUrl ?? "",
          }}
        />
      </section>
      <section className="card">
        <h2 className="text-xl font-semibold mb-4">{t("candidate.resumes")}</h2>
        <ResumeManager resumes={candidate.resumes.map((r) => ({ id: r.id, filename: r.filename, isPrimary: r.isPrimary }))} />
      </section>
    </div>
  );
}
