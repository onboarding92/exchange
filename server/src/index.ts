import express from "express";
import cors from "cors";
import { config } from "./config";
import { router } from "./routers";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

// ------------------- SECURITY MIDDLEWARE -------------------

// Security headers
app.use(helmet());

// Gzip compression
app.use(compression());

// Global rate limit (15min — 300 req)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
});
app.use(globalLimiter);

// Tighter rate-limit for login
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
});

// CORS & body parsing
const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "https://example.com"
    : "*";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security layers
app.use(helmet());
app.use(compression());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
});
app.post("/api/auth/login", loginLimiter);

// Apply login limiter
app.post("/auth/login", loginLimiter);

// Main router
app.use("/api", router);

const port = config.PORT;
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log("Server running on port", port);
});