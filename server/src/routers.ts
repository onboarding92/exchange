import { router } from "./trpc";
import { deviceRouter } from "./routers.device";
import { authRouter } from "./routers.auth";
import { adminRouter } from "./routers.admin";
import { walletRouter } from "./routers.wallet";
import { marketRouter } from "./routers.market";
import { stakingRouter } from "./routers.staking";

export const appRouter = router({
  devices: deviceRouter,
  auth: authRouter,
  admin: adminRouter,
  wallet: walletRouter,
  market: marketRouter,
  staking: stakingRouter,
});

export type AppRouter = typeof appRouter;
