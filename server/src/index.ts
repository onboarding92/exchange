import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { config } from "./config";
import { appRouter } from "./routers";

const app = express();

app.set("trust proxy", 1);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 16) {
  console.warn(
    "[BitChange] Weak or missing SESSION_SECRET. Do NOT use this config in production."
  );
}

app.use(helmet());
app.use(compression());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
  })
);

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "http://46.224.87.94"
    : "*";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(
  "/api",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res, user: null }),
  })
);

const port = config.PORT || 3001;
app.listen(port, () => {
  console.log("Server running on port", port);
});
