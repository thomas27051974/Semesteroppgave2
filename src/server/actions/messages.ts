"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { publishToThread } from "@/server/pubsub/client";
import { sendEmail } from "@/server/email/send";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const chatSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export async function sendChatMessage(input: z.infer<typeof chatSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Ikke autorisert");
  const data = chatSchema.parse(input);

  const application = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: { candidate: true },
  });
  if (!application) throw new Error("Søknad finnes ikke");
  if (
    session.user.role === "CANDIDATE" &&
    application.candidate.userId !== session.user.id
  ) {
    throw new Error("Ikke autorisert");
  }

  const thread = await prisma.messageThread.upsert({
    where: { applicationId_channel: { applicationId: application.id, channel: "CHAT" } },
    create: { applicationId: application.id, channel: "CHAT" },
    update: {},
  });

  const direction = session.user.role === "CANDIDATE" ? "IN" : "OUT";
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      authorUserId: session.user.id,
      direction,
      body: data.body,
    },
  });

  await publishToThread(thread.id, {
    type: "message",
    id: message.id,
    body: message.body,
    direction,
    sentAt: message.sentAt,
  });

  revalidatePath(`/admin/kandidater/${application.candidateId}`);
  revalidatePath(`/kandidat/soknader/${application.id}`);
  return { messageId: message.id };
}

const emailSchema = z.object({
  applicationId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function sendEmailMessage(input: z.infer<typeof emailSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role === "CANDIDATE") {
    throw new Error("Ikke autorisert");
  }
  const data = emailSchema.parse(input);

  const application = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: { candidate: { include: { user: true } } },
  });
  if (!application) throw new Error("Søknad finnes ikke");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;line-height:1.5;">${data.body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;
  const { messageId } = await sendEmail({
    to: application.candidate.user.email,
    subject: data.subject,
    html,
  });

  const thread = await prisma.messageThread.upsert({
    where: { applicationId_channel: { applicationId: application.id, channel: "EMAIL" } },
    create: { applicationId: application.id, channel: "EMAIL", subject: data.subject },
    update: {},
  });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      authorUserId: session.user.id,
      direction: "OUT",
      body: `${data.subject}\n\n${data.body}`,
      externalId: messageId,
    },
  });

  revalidatePath(`/admin/kandidater/${application.candidateId}`);
}
