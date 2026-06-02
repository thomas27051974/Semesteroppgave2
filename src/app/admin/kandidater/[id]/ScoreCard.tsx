"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitInterviewScore } from "@/server/actions/interviews";

type Question = { id: string; text: string; weight: number };
type Set = { id: string; name: string; questions: Question[] };

export function ScoreCard({ applicationId, interviewSets }: { applicationId: string; interviewSets: Set[] }) {
  const t = useTranslations();
  const [setId, setSetId] = useState<string>(interviewSets[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = interviewSets.find((s) => s.id === setId);
  if (!set) return <p className="text-sm text-slate-500">Opprett et intervjusett først.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const answers: Record<string, { score: number; note: string }> = {};
        for (const q of set.questions) {
          answers[q.id] = {
            score: Number(fd.get(`score-${q.id}`) ?? 3),
            note: String(fd.get(`note-${q.id}`) ?? ""),
          };
        }
        setError(null);
        start(async () => {
          try {
            await submitInterviewScore({ applicationId, interviewSetId: set.id, answers });
            setDone(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Noe gikk galt");
          }
        });
      }}
      className="space-y-3"
    >
      <select value={setId} onChange={(e) => setSetId(e.target.value)} className="input max-w-sm">
        {interviewSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="space-y-3">
        {set.questions.map((q) => (
          <div key={q.id} className="rounded border border-slate-200 p-3">
            <p className="text-sm font-medium">{q.text} <span className="text-xs text-slate-500">(vekt {q.weight})</span></p>
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs text-slate-600">Score</label>
              <select name={`score-${q.id}`} defaultValue="3" className="input max-w-[8rem]">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
              <input name={`note-${q.id}`} placeholder="Notat" className="input" />
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-700">Vurdering lagret.</p>}
      <button className="btn-primary" disabled={pending}>{t("admin.submitScore")}</button>
    </form>
  );
}
