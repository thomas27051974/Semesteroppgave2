import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email/send";
import { renderTemplate } from "@/server/email/render";

export async function sendEmailAction(args: {
  applicationId: string;
  config: Record<string, unknown>;
}) {
  const templateId = String(args.config.templateId ?? "");
  if (!templateId) throw new Error("sendEmail: missing templateId");
  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`sendEmail: template ${templateId} not found`);

  const application = await prisma.application.findUnique({
    where: { id: args.applicationId },
    include: {
      candidate: { include: { user: true } },
      job: true,
      currentStage: true,
    },
  });
  if (!application) throw new Error("sendEmail: application not found");

  const ctx = {
    candidate: {
      firstName: application.candidate.user.name.split(" ")[0],
      name: application.candidate.user.name,
      email: application.candidate.user.email,
    },
    job: { title: application.job.title, location: application.job.location },
    stage: { name: application.currentStage.name },
  };
  const subject = renderTemplate(template.subject, ctx);
  const body = renderTemplate(template.bodyMarkdown, ctx);
  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;line-height:1.5;">${body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;

  const { messageId } = await sendEmail({ to: application.candidate.user.email, subject, html });

  // Persist into unified email thread.
  const thread = await prisma.messageThread.upsert({
    where: { applicationId_channel: { applicationId: application.id, channel: "EMAIL" } },
    create: { applicationId: application.id, channel: "EMAIL", subject },
    update: {},
  });
  await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: "OUT",
      body: `${subject}\n\n${body}`,
      externalId: messageId,
    },
  });
}
