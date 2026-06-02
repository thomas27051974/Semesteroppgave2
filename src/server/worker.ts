import "dotenv/config";
import { getBoss, QUEUE_AUTOMATIONS } from "./queue";
import { runAutomationsForTransition } from "./automations/engine";

async function main() {
  const boss = await getBoss();
  await boss.work<{ transitionId: string }>(QUEUE_AUTOMATIONS, async (job) => {
    const payload = Array.isArray(job) ? job[0]?.data : (job as { data: { transitionId: string } }).data;
    if (!payload?.transitionId) return;
    await runAutomationsForTransition(payload.transitionId);
  });
  console.log("[worker] subscribed to", QUEUE_AUTOMATIONS);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
