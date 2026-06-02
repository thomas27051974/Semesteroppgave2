import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@ageri.no").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrator",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`Admin: ${admin.email} / ${adminPassword}`);

  const existingTemplate = await prisma.pipeline.findFirst({ where: { isTemplate: true } });
  if (!existingTemplate) {
    await prisma.pipeline.create({
      data: {
        name: "Standard rekrutteringsprosess",
        isTemplate: true,
        stages: {
          create: [
            { name: "Søkt", order: 0, type: "APPLIED" },
            { name: "Screening", order: 1, type: "SCREENING" },
            { name: "Førstegangsintervju", order: 2, type: "INTERVIEW" },
            { name: "Andregangsintervju", order: 3, type: "INTERVIEW" },
            { name: "Tilbud", order: 4, type: "OFFER" },
            { name: "Ansatt", order: 5, type: "HIRED" },
            { name: "Avslått", order: 6, type: "REJECTED" },
          ],
        },
      },
    });
    console.log("Opprettet standard rekrutteringsprosess");
  }

  const templates = [
    {
      name: "Takk for søknaden",
      subject: "Vi har mottatt søknaden din til {{job.title}}",
      bodyMarkdown:
        "Hei {{candidate.firstName}},\n\nTakk for at du har søkt på stillingen som {{job.title}} hos oss.\n\nVi går gjennom alle søknader fortløpende og kommer tilbake til deg så snart som mulig.\n\nMed vennlig hilsen\nRekrutteringsteamet",
    },
    {
      name: "Innkalling til intervju",
      subject: "Innkalling til intervju – {{job.title}}",
      bodyMarkdown:
        "Hei {{candidate.firstName}},\n\nVi har lest gjennom søknaden din og ønsker å invitere deg til et intervju for stillingen som {{job.title}}.\n\nVi sender deg et tidsforslag i en egen e-post.\n\nMed vennlig hilsen\nRekrutteringsteamet",
    },
    {
      name: "Tilbakemelding – ikke videre",
      subject: "Tilbakemelding på søknad – {{job.title}}",
      bodyMarkdown:
        "Hei {{candidate.firstName}},\n\nTakk for at du har søkt på stillingen som {{job.title}}. Etter en samlet vurdering har vi dessverre valgt å gå videre med andre kandidater i denne prosessen.\n\nVi ønsker deg lykke til videre.\n\nMed vennlig hilsen\nRekrutteringsteamet",
    },
    {
      name: "Tilbud om stilling",
      subject: "Tilbud om stilling – {{job.title}}",
      bodyMarkdown:
        "Hei {{candidate.firstName}},\n\nVi har gleden av å tilby deg stillingen som {{job.title}}.\n\nVi sender egen kontrakt i en oppfølgende e-post.\n\nMed vennlig hilsen\nRekrutteringsteamet",
    },
  ];
  for (const t of templates) {
    const existing = await prisma.emailTemplate.findFirst({ where: { name: t.name } });
    if (!existing) await prisma.emailTemplate.create({ data: t });
  }
  console.log("Seedet e-postmaler");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
