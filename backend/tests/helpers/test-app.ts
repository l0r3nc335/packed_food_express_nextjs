import type { Express } from "express";
import { createApp } from "../../src/app";
import type { DemoUser } from "../../src/repositories/types";
import { createBillingService, type BillingService } from "../../src/services/billing";
import { createStubBillingProvider } from "../../src/services/billing/stub-billing-provider";
import type { BillingProvider } from "../../src/services/billing/types";
import type { OffProduct } from "../../src/services/off-types";
import { createProductService } from "../../src/services/product-service";
import {
  createFakeOffClient,
  createFakeSearchRepository,
  createFakeUserRepository,
  SAMPLE_OFF_PRODUCTS,
  type FakeOffClient,
  type FakeSearchRepository,
  type FakeUserRepository,
} from "./fakes";

export const FRONTEND_URL = "http://localhost:3000";

export type TestAppOptions = {
  user?: Partial<DemoUser>;
  products?: OffProduct[];
  provider?: BillingProvider;
};

export type TestApp = {
  app: Express;
  users: FakeUserRepository;
  searches: FakeSearchRepository;
  offClient: FakeOffClient;
  billingService: BillingService;
};

export function createTestApp(options: TestAppOptions = {}): TestApp {
  const users = createFakeUserRepository(options.user);
  const searches = createFakeSearchRepository();
  const offClient = createFakeOffClient(options.products ?? SAMPLE_OFF_PRODUCTS);

  const billingService = createBillingService({
    users,
    provider: options.provider ?? createStubBillingProvider(),
  });

  const app = createApp({
    productService: createProductService({ offClient, users, searches }),
    billingService,
    users,
    searches,
    frontendUrl: FRONTEND_URL,
  });

  return { app, users, searches, offClient, billingService };
}

export const ACTIVE_SUBSCRIPTION = {
  status: "active",
  stripeSubscriptionId: "sub_123",
  currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
};
