import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import type { Ctx } from "./trpc";
import { getSession } from "./session";
import { seedIfEmpty } from "./db";
import cron from "node-cron";
import { stakingCronJob } from "./jobs/stakingCron";


seedIfEmpty();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use("/trpc", createExpressMiddleware({
  router: appRouter,
  createContext: ({ req, res }): Ctx => {
    const token = req.cookies?.session as string | undefined;
    const sess = getSession(token);
    return { req, res, user: sess };
  },
}));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log("API listening on http://localhost:" + port);
});
cron.schedule("* * * * *", async () => {
  try {
    await stakingCronJob();
  } catch (err) {
    console.error("[STAKING CRON ERROR]", err);
  }
});
