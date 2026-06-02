"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createAutomation, deleteAutomation, toggleAutomation } from "@/server/actions/automations";

type Stage = { id: string; name: string };
type EmailTemplate = { id: string; name: string };
type Recruiter = { id: string; name: string; email: string };
type Automation = {
  id: string;
  stageId: string;
  event: "ON_ENTER" | "ON_EXIT";
  actionType: "SEND_EMAIL" | "NOTIFY_USER" | "CREATE_TASK" | "ADD_TAG";
  enabled: boolean;
  config: Record<string, unknown>;
};

export function AutomationsEditor(props: {
  pipelineId: string;
  stages: Stage[];
  automations: Automation[];
  emailTemplates: EmailTemplate[];
  recruiters: Recruiter[];
}) {
  const t = useTranslations();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const [actionType, setActionType] = useState<Automation["actionType"]>("SEND_EMAIL");

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {props.automations.length === 0 && <li className="text-sm text-slate-500">Ingen automatiseringer ennå.</li>}
        {props.automations.map((a) => {
          const stage = props.stages.find((s) => s.id === a.stageId)?.name ?? "?";
          const labelMap = {
            SEND_EMAIL: t("admin.actionSendEmail"),
            NOTIFY_USER: t("admin.actionNotifyUser"),
            CREATE_TASK: t("admin.actionCreateTask"),
            ADD_TAG: t("admin.actionAddTag"),
          } as const;
          const detail = a.actionType === "SEND_EMAIL"
            ? props.emailTemplates.find((tpl) => tpl.id === (a.config.templateId as string))?.name ?? ""
            : a.actionType === "ADD_TAG"
            ? String(a.config.tag ?? "")
            : a.actionType === "CREATE_TASK"
            ? String(a.config.title ?? "")
            : String(a.config.message ?? "");
          return (
            <li key={a.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
              <span>
                <strong>{stage}</strong> · {a.event === "ON_ENTER" ? t("admin.onEnter") : t("admin.onExit")}
                {" → "}{labelMap[a.actionType]}{detail ? ` (${detail})` : ""}
              </span>
              <span className="flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    defaultChecked={a.enabled}
                    onChange={(e) => start(() => toggleAutomation(a.id, e.target.checked))}
                  />
                  Aktiv
                </label>
                <button
                  className="btn-danger text-xs"
                  disabled={pending}
                  onClick={() => start(() => deleteAutomation(a.id))}
                >
                  {t("common.delete")}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {!adding ? (
        <button className="btn-secondary" onClick={() => setAdding(true)}>{t("admin.addAutomation")}</button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const base = {
              pipelineId: props.pipelineId,
              stageId: String(fd.get("stageId") ?? ""),
              event: String(fd.get("event") ?? "ON_ENTER") as "ON_ENTER" | "ON_EXIT",
              actionType,
            };
            start(async () => {
              if (actionType === "SEND_EMAIL") {
                await createAutomation({ ...base, actionType: "SEND_EMAIL", templateId: String(fd.get("templateId") ?? "") });
              } else if (actionType === "NOTIFY_USER") {
                await createAutomation({ ...base, actionType: "NOTIFY_USER", userId: String(fd.get("userId") ?? ""), message: String(fd.get("message") ?? "") });
              } else if (actionType === "CREATE_TASK") {
                await createAutomation({
                  ...base,
                  actionType: "CREATE_TASK",
                  assigneeUserId: String(fd.get("assigneeUserId") ?? ""),
                  title: String(fd.get("title") ?? ""),
                  dueInDays: Number(fd.get("dueInDays") ?? 3),
                });
              } else if (actionType === "ADD_TAG") {
                await createAutomation({ ...base, actionType: "ADD_TAG", tag: String(fd.get("tag") ?? "") });
              }
              setAdding(false);
            });
          }}
          className="space-y-3 rounded border border-slate-200 p-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Steg</label>
              <select name="stageId" required className="input">
                {props.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hendelse</label>
              <select name="event" required className="input">
                <option value="ON_ENTER">{t("admin.onEnter")}</option>
                <option value="ON_EXIT">{t("admin.onExit")}</option>
              </select>
            </div>
            <div>
              <label className="label">Handling</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as Automation["actionType"])}
                className="input"
              >
                <option value="SEND_EMAIL">{t("admin.actionSendEmail")}</option>
                <option value="NOTIFY_USER">{t("admin.actionNotifyUser")}</option>
                <option value="CREATE_TASK">{t("admin.actionCreateTask")}</option>
                <option value="ADD_TAG">{t("admin.actionAddTag")}</option>
              </select>
            </div>
          </div>

          {actionType === "SEND_EMAIL" && (
            <div>
              <label className="label">{t("admin.selectTemplate")}</label>
              <select name="templateId" required className="input">
                {props.emailTemplates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
              </select>
            </div>
          )}
          {actionType === "NOTIFY_USER" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Medarbeider</label>
                <select name="userId" required className="input">
                  {props.recruiters.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Melding</label>
                <input name="message" required className="input" defaultValue="Ny aktivitet på kandidat" />
              </div>
            </div>
          )}
          {actionType === "CREATE_TASK" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Tildel til</label>
                <select name="assigneeUserId" required className="input">
                  {props.recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tittel</label>
                <input name="title" required className="input" defaultValue="Ring kandidat" />
              </div>
              <div>
                <label className="label">Frist (dager)</label>
                <input name="dueInDays" type="number" min={0} max={60} defaultValue={3} className="input" />
              </div>
            </div>
          )}
          {actionType === "ADD_TAG" && (
            <div>
              <label className="label">Etikett</label>
              <input name="tag" required className="input" placeholder="f.eks. Lovende" />
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-primary" disabled={pending}>{t("common.save")}</button>
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>{t("common.cancel")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
