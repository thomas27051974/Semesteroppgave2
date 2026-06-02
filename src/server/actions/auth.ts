"use server";

import { prisma } from "@/server/db";
import { hashPassword, signIn } from "@/server/auth";
import { z } from "zod";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerCandidate(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("E-posten er allerede i bruk");
  await prisma.user.create({
    data: {
      email,
      name: data.name,
      role: "CANDIDATE",
      passwordHash: await hashPassword(data.password),
      candidate: { create: {} },
    },
  });
  await signIn("credentials", { email, password: data.password, redirectTo: "/kandidat" });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Feil e-post eller passord." };
    }
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  redirect(user?.role === "RECRUITER" || user?.role === "ADMIN" ? "/admin" : "/kandidat");
}
