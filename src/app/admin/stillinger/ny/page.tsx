import { getTranslations } from "next-intl/server";
import { NewJobForm } from "./NewJobForm";

export default async function NewJobPage() {
  const t = await getTranslations();
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{t("admin.newJob")}</h1>
      <NewJobForm />
    </div>
  );
}
