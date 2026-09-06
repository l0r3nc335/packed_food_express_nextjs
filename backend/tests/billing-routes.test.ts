import request from "supertest";
import { describe, expect, it } from "vitest";
import type { DemoUserSummary } from "../src/types/product";
import { ACTIVE_SUBSCRIPTION, FRONTEND_URL, createTestApp } from "./helpers/test-app";

describe("POST /api/billing/checkout", () => {
  it("returns a checkout URL that carries the locale-specific return path", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/billing/checkout").send({ locale: "de" });
    const body = response.body as { url: string; mode: string };

    expect(response.status).toBe(200);
    expect(body.mode).toBe("stub");
    expect(body.url).toContain(
      encodeURIComponent(`${FRONTEND_URL}/de?checkout=success&session_id={CHECKOUT_SESSION_ID}`),
    );
  });

  it("falls back to English for an unsupported locale", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/billing/checkout").send({ locale: "es" });

    expect((response.body as { url: string }).url).toContain(
      encodeURIComponent(`${FRONTEND_URL}/en?checkout=success&session_id={CHECKOUT_SESSION_ID}`),
    );
  });
});

describe("POST /api/billing/confirm", () => {
  it("returns applied=false in stub mode (activation happens via stub/complete)", async () => {
    const { app } = createTestApp();

    const response = await request(app).post("/api/billing/confirm").send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ applied: false, status: null });
  });

  it("activates from a provider confirmCheckoutSession result", async () => {
    const { app, users } = createTestApp({
      provider: {
        mode: "stripe",
        async createCheckoutSession() {
          return { id: "cs_1", url: "https://checkout.stripe.test", stripeCustomerId: "cus_1" };
        },
        parseWebhook() {
          return { type: "ignored", eventType: "noop" };
        },
        async confirmCheckoutSession() {
          return {
            type: "subscription_changed",
            status: "active",
            stripeCustomerId: "cus_1",
            stripeSubscriptionId: "sub_1",
            currentPeriodEnd: new Date("2099-06-01T00:00:00.000Z"),
          };
        },
        async syncCustomerSubscription() {
          return null;
        },
      },
    });

    const response = await request(app)
      .post("/api/billing/confirm")
      .send({ sessionId: "cs_test_123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ applied: true, status: "active" });
    expect(users.user.subscription?.status).toBe("active");
    expect(users.user.stripeCustomerId).toBe("cus_1");
  });

  it("falls back to syncing the stored Stripe customer when no session id is given", async () => {
    const { app, users } = createTestApp({
      user: { stripeCustomerId: "cus_existing" },
      provider: {
        mode: "stripe",
        async createCheckoutSession() {
          return { id: "cs_1", url: "https://checkout.stripe.test", stripeCustomerId: "cus_existing" };
        },
        parseWebhook() {
          return { type: "ignored", eventType: "noop" };
        },
        async confirmCheckoutSession() {
          return null;
        },
        async syncCustomerSubscription(customerId) {
          expect(customerId).toBe("cus_existing");
          return {
            type: "subscription_changed",
            status: "active",
            stripeCustomerId: customerId,
            stripeSubscriptionId: "sub_synced",
            currentPeriodEnd: null,
          };
        },
      },
    });

    const response = await request(app).post("/api/billing/confirm").send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ applied: true, status: "active" });
    expect(users.user.subscription?.status).toBe("active");
  });
});

describe("stub checkout completion", () => {
  it("activates the subscription and redirects back to the frontend", async () => {
    const { app, users } = createTestApp();

    const response = await request(app)
      .get("/api/billing/stub/complete")
      .query({ redirect: `${FRONTEND_URL}/nl?checkout=success` });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${FRONTEND_URL}/nl?checkout=success`);
    expect(users.user.subscription?.status).toBe("active");
  });

  it("refuses to redirect to an external host", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get("/api/billing/stub/complete")
      .query({ redirect: "https://evil.example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("billing_error");
  });

  it("cancels an active stub subscription", async () => {
    const { app, users } = createTestApp({ user: { subscription: ACTIVE_SUBSCRIPTION } });

    const response = await request(app).post("/api/billing/stub/cancel");

    expect(response.status).toBe(200);
    expect(users.user.subscription?.status).toBe("canceled");
  });
});

describe("GET /api/me", () => {
  it("reports an inactive subscription for a fresh demo user", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/me");
    const body = response.body as { user: DemoUserSummary; billingMode: string };

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("demo@example.com");
    expect(body.user.subscription).toEqual({
      status: "none",
      isActive: false,
      currentPeriodEnd: null,
    });
    expect(body.billingMode).toBe("stub");
  });

  it("reports an active subscription with its period end", async () => {
    const { app } = createTestApp({ user: { subscription: ACTIVE_SUBSCRIPTION } });

    const response = await request(app).get("/api/me");
    const body = response.body as { user: DemoUserSummary };

    expect(body.user.subscription.isActive).toBe(true);
    expect(body.user.subscription.currentPeriodEnd).toBe("2099-01-01T00:00:00.000Z");
  });
});
