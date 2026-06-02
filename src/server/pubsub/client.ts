import { WebPubSubServiceClient } from "@azure/web-pubsub";

let serviceClient: WebPubSubServiceClient | null = null;

function getServiceClient(): WebPubSubServiceClient | null {
  const conn = process.env.WEBPUBSUB_CONNECTION_STRING;
  if (!conn) return null;
  if (!serviceClient) {
    serviceClient = new WebPubSubServiceClient(conn, process.env.WEBPUBSUB_HUB ?? "ats");
  }
  return serviceClient;
}

export async function publishToThread(threadId: string, payload: unknown): Promise<void> {
  const c = getServiceClient();
  if (!c) return;
  await c.group(`thread:${threadId}`).sendToAll(payload as object);
}

export async function getClientAccessUrl(threadId: string): Promise<string | null> {
  const c = getServiceClient();
  if (!c) return null;
  const token = await c.getClientAccessToken({
    roles: [
      `webpubsub.joinLeaveGroup.thread:${threadId}`,
      `webpubsub.sendToGroup.thread:${threadId}`,
    ],
    groups: [`thread:${threadId}`],
  });
  return token.url;
}
