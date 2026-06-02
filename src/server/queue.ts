import PgBoss from "pg-boss";

let boss: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

export const QUEUE_AUTOMATIONS = "automations.runTransition";

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  if (!starting) {
    starting = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required for pg-boss");
      const instance = new PgBoss({ connectionString: url });
      await instance.start();
      boss = instance;
      return instance;
    })();
  }
  return starting;
}

export async function enqueueAutomationsForTransition(transitionId: string): Promise<void> {
  const b = await getBoss();
  await b.send(QUEUE_AUTOMATIONS, { transitionId });
}
