import { EmailClient } from "@azure/communication-email";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

let client: EmailClient | null = null;
function getClient() {
  const conn = process.env.ACS_CONNECTION_STRING;
  if (!conn) return null;
  if (!client) client = new EmailClient(conn);
  return client;
}

export async function sendEmail(msg: OutboundEmail): Promise<{ messageId: string | null }> {
  const c = getClient();
  const sender = process.env.ACS_SENDER_ADDRESS ?? "DoNotReply@example.com";
  if (!c) {
    // Dev fallback: log instead of throwing so the rest of the system works locally.
    console.log("[email:dev]", { from: sender, ...msg });
    return { messageId: `dev-${Date.now()}` };
  }
  const poller = await c.beginSend({
    senderAddress: sender,
    recipients: { to: [{ address: msg.to }] },
    content: {
      subject: msg.subject,
      html: msg.html,
      plainText: msg.plainText ?? msg.html.replace(/<[^>]+>/g, ""),
    },
    replyTo: msg.replyTo ? [{ address: msg.replyTo }] : undefined,
    headers: msg.headers,
  });
  const result = await poller.pollUntilDone();
  return { messageId: result.id ?? null };
}
