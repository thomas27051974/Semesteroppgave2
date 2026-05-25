import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Azure Communication Services inbound email events arrive as Event Grid events.
// We accept the SubscriptionValidation handshake and then process IncomingEmail events.
// Reply matching uses the In-Reply-To / References header, which we set to a value
// derived from the thread id when sending outbound mail.
export async function POST(req: Request) {
  const events = (await req.json()) as Array<{
    eventType: string;
    data: Record<string, unknown>;
  }>;

  for (const event of events) {
    if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      const code = (event.data as { validationCode: string }).validationCode;
      return NextResponse.json({ validationResponse: code });
    }
    if (
      event.eventType === "Microsoft.Communication.EmailInbound" ||
      event.eventType === "Microsoft.Communication.IncomingEmail"
    ) {
      const data = event.data as {
        from?: string;
        subject?: string;
        plainText?: string;
        html?: string;
        headers?: Record<string, string>;
        messageId?: string;
      };
      const inReplyTo = data.headers?.["In-Reply-To"] ?? data.headers?.["in-reply-to"];
      const refs = data.headers?.["References"] ?? data.headers?.["references"] ?? "";
      const threadId = parseThreadIdFromHeader(inReplyTo) ?? parseThreadIdFromHeader(refs);

      if (threadId) {
        const thread = await prisma.messageThread.findUnique({ where: { id: threadId } });
        if (thread) {
          await prisma.message.create({
            data: {
              threadId: thread.id,
              direction: "IN",
              body: data.plainText ?? (data.html ? data.html.replace(/<[^>]+>/g, "") : ""),
              externalId: data.messageId,
            },
          });
        }
      } else if (data.from) {
        // Fallback: try to match by candidate email and pick most recent EMAIL thread.
        const user = await prisma.user.findUnique({ where: { email: data.from.toLowerCase() } });
        if (user) {
          const candidate = await prisma.candidate.findUnique({ where: { userId: user.id } });
          if (candidate) {
            const thread = await prisma.messageThread.findFirst({
              where: { channel: "EMAIL", application: { candidateId: candidate.id } },
              orderBy: { createdAt: "desc" },
            });
            if (thread) {
              await prisma.message.create({
                data: {
                  threadId: thread.id,
                  direction: "IN",
                  body: data.plainText ?? "",
                  externalId: data.messageId,
                },
              });
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function parseThreadIdFromHeader(value: string | undefined): string | null {
  if (!value) return null;
  // We expect outbound Message-Id of the form: <thread.{threadId}.{uuid}@host>
  const match = /<thread\.([^.>]+)\./.exec(value);
  return match?.[1] ?? null;
}
