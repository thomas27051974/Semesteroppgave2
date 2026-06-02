import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { getClientAccessUrl } from "@/server/pubsub/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { application: { include: { candidate: true } } },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorize: candidate can only access their own thread; recruiter/admin always.
  if (session.user.role === "CANDIDATE" && thread.application.candidate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await getClientAccessUrl(threadId);
  return NextResponse.json({ url });
}
