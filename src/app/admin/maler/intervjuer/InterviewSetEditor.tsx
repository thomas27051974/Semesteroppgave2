"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createInterviewSet } from "@/server/actions/interviews";

export function InterviewSetEditor() {
  const t = useTranslations();
  const [questions, setQuestions] = useState<{ text: string; weight: number }[]>([
    { text: "", weight: 1 },
  ]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") ?? "");
        const description = String(fd.get("description") ?? "");
        setError(null);
        start(async () => {
          try {
            await createInterviewSet({
              name,
              description: description || undefined,
              questions: questions.filter((q) => q.text.trim()),
            });
            setQuestions([{ text: "", weight: 1 }]);
            (e.target as HTMLFormElement).reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="card space-y-4"
    >
      <h2 className="font-semibold">Nytt intervjusett</h2>
      <div>
        <label className="label">{t("common.name")}</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label">{t("common.description")}</label>
        <textarea name="description" rows={3} className="input" />
      </div>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={q.text}
              onChange={(e) => setQuestions((qs) => qs.map((x, j) => (i === j ? { ...x, text: e.target.value } : x)))}
              placeholder={`Spørsmål ${i + 1}`}
              className="input"
            />
            <input
              type="number"
              min={1}
              max={5}
              value={q.weight}
              onChange={(e) => setQuestions((qs) => qs.map((x, j) => (i === j ? { ...x, weight: Number(e.target.value) } : x)))}
              className="input max-w-[5rem]"
            />
            <button
              type="button"
              className="btn-danger text-xs"
              onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
            >
              –
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary text-xs" onClick={() => setQuestions((qs) => [...qs, { text: "", weight: 1 }])}>
          + Legg til spørsmål
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={pending}>{t("common.create")}</button>
    </form>
  );
}
