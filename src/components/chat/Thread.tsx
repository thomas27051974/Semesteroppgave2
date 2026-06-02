"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendChatMessage } from "@/server/actions/messages";

type ThreadMessage = {
  id: string;
  body: string;
  direction: "IN" | "OUT";
  authorUserId: string | null;
  sentAt: string;
};

export function Thread({
  applicationId,
  threadId,
  currentUserId,
  messages: initialMessages,
  composerPlaceholder,
}: {
  applicationId: string;
  threadId: string | null;
  currentUserId: string;
  messages: ThreadMessage[];
  composerPlaceholder: string;
}) {
  const t = useTranslations();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Real-time subscription via WebPubSub negotiate endpoint.
  useEffect(() => {
    if (!threadId) return;
    let socket: WebSocket | null = null;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/realtime/negotiate?threadId=${threadId}`);
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string | null };
      if (!url || cancelled) return;
      socket = new WebSocket(url, "json.webpubsub.azure.v1");
      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const payload = data?.data;
          if (payload?.type === "message") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [
                ...prev,
                {
                  id: payload.id,
                  body: payload.body,
                  direction: payload.direction,
                  authorUserId: null,
                  sentAt: payload.sentAt,
                },
              ];
            });
          }
        } catch {
          /* ignore */
        }
      };
      socket.onopen = () => {
        socket?.send(
          JSON.stringify({ type: "joinGroup", group: `thread:${threadId}`, ackId: 1 }),
        );
      };
    })();
    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [threadId]);

  return (
    <div className="flex h-[480px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">{t("admin.noMessages")}</p>
        )}
        {messages.map((m) => {
          const mine = m.authorUserId === currentUserId;
          return (
            <div key={m.id} className={mine ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                  (mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900")
                }
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          const toSend = body;
          setBody("");
          start(async () => {
            await sendChatMessage({ applicationId, body: toSend });
            // Optimistic: the action revalidates the page; for snappier feel,
            // we also append locally.
            setMessages((prev) => [
              ...prev,
              {
                id: `local-${Date.now()}`,
                body: toSend,
                direction: "OUT",
                authorUserId: currentUserId,
                sentAt: new Date().toISOString(),
              },
            ]);
          });
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={composerPlaceholder}
          className="input"
        />
        <button className="btn-primary" disabled={pending || !body.trim()}>
          {t("common.send")}
        </button>
      </form>
    </div>
  );
}
