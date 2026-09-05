import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { disconnectPrisma, getPrismaClient } from "./lib/prisma";
import { logger } from "./lib/logger";
import { createPrismaSearchRepository } from "./repositories/prisma-search-repository";
import { createPrismaUserRepository } from "./repositories/prisma-user-repository";
import { createBillingProvider, createBillingService } from "./services/billing";
import { createOffClient } from "./services/off-client";
import { createProductService } from "./services/product-service";

function start(): void {
  const env = loadEnv();
  const prisma = getPrismaClient();

  const users = createPrismaUserRepository(prisma);
  const searches = createPrismaSearchRepository(prisma);

  const offClient = createOffClient({
    baseUrl: env.OFF_BASE_URL,
    userAgent: env.OFF_USER_AGENT,
    timeoutMs: env.OFF_TIMEOUT_MS,
  });

  const billingService = createBillingService({
    users,
    provider: createBillingProvider(env),
  });

  const app = createApp({
    productService: createProductService({ offClient, users, searches }),
    billingService,
    users,
    searches,
    frontendUrl: env.FRONTEND_URL,
  });

  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`, {
      billingMode: billingService.mode,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => {
      void disconnectPrisma().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  start();
} catch (error) {
  logger.error("Failed to start the API", { error });
  process.exitCode = 1;
}
