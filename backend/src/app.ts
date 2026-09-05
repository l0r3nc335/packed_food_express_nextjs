import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import { AppError } from "./lib/errors";
import { logger } from "./lib/logger";
import type { SearchRepository, UserRepository } from "./repositories/types";
import { createBillingRoutes } from "./routes/billing";
import { createMeRoutes } from "./routes/me";
import { createProductRoutes } from "./routes/products";
import { createSearchRoutes } from "./routes/searches";
import { createStripeWebhookRoutes } from "./routes/stripe-webhook";
import type { BillingService } from "./services/billing";
import type { ProductService } from "./services/product-service";

export type AppDependencies = {
  productService: ProductService;
  billingService: BillingService;
  users: UserRepository;
  searches: SearchRepository;
  frontendUrl: string;
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { code: error.code, cause: error.cause });
    }

    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }

  logger.error("Unhandled error", { error });
  res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong. Please try again." },
  });
};

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: deps.frontendUrl }));

  // Must precede express.json(): Stripe verifies the raw request body.
  app.use("/api/stripe/webhook", createStripeWebhookRoutes(deps.billingService));

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", billingMode: deps.billingService.mode });
  });

  app.use("/api/products", createProductRoutes(deps.productService));
  app.use("/api/searches", createSearchRoutes(deps.users, deps.searches));
  app.use("/api/me", createMeRoutes(deps.users, deps.billingService));
  app.use("/api/billing", createBillingRoutes(deps.billingService, { frontendUrl: deps.frontendUrl }));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  app.use(errorHandler);

  return app;
}
