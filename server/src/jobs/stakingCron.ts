import dayjs from "dayjs";
import { prisma } from "../prisma";

/**
 * Aggiorna periodicamente le ricompense di staking
 * in base al tempo trascorso e all APR configurato sulla posizione.
 *
 * Formula (semplice interest, no compound):
 * reward = amount * (APR / 100) * (days / 365)
 */
export async function stakingCronJob() {
  const positions = await prisma.stakingPosition.findMany({
    where: { status: "active" },
  });

  if (!positions.length) {
    return;
  }

  const now = dayjs();

  for (const pos of positions) {
    const lastUpdate = dayjs(pos.updatedAt ?? pos.createdAt);
    const days = now.diff(lastUpdate, "day", true);

    if (days <= 0) continue;

    const apr = Number(pos.apr) / 100;
    const amount = Number(pos.amount);

    const reward = amount * apr * (days / 365);

    await prisma.stakingPosition.update({
      where: { id: pos.id },
      data: {
        reward: {
          increment: reward,
        },
        updatedAt: new Date(),
      },
    });
  }

  console.log(`[STAKING CRON] Updated ${positions.length} positions at ${now.toISOString()}`);
}
