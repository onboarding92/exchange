import { router } from "./trpc";
import { authRouter } from "./routers.auth";
import { walletRouter } from "./routers.wallet";
import { marketRouter } from "./routers.market";
import { promoRouter } from "./routers.promo";
import { stakingRouter } from "./routers.staking";
import { transactionsRouter } from "./routers.transactions";
import { internalRouter } from "./routers.internal";
import { supportRouter } from "./routers.support";
import { adminRouter } from "./routers.admin";
import { paymentRouter } from "./routers.payment";

export const appRouter = router({
  payment: paymentRouter,
  auth: authRouter,
  wallet: walletRouter,
  market: marketRouter,
  promo: promoRouter,
  staking: stakingRouter,
  transactions: transactionsRouter,
  internal: internalRouter,
  support: supportRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;