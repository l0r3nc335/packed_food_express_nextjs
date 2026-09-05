import Stripe from "stripe";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createStripeBillingProvider } from "../src/services/billing/stripe-billing-provider";
import type { SearchResult } from "../src/types/product";
import { createTestApp } from "./helpers/test-app";

const WEBHOOK_SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy_key");

function buildProvider() {
  return createStripeBillingProvider({
    secretKey: "sk_test_dummy_key",
    priceId: "price_test_monthly",
    webhookSecret: WEBHOOK_SECRET,
    stripe,
  });
}

/** Signs a payload exactly like Stripe does, so verification is exercised for real. */
function signedRequest(payload: Record<string, unknown>): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });

  return { body, signature };
}

describe("POST /api/stripe/webhook", () => {
  let testApp: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    testApp = createTestApp({ provider: buildProvider() });
  });

  it("rejects a payload with a missing signature header", async () => {
    const response = await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }));

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Missing stripe-signature header");
    expect(testApp.users.upserts).toHaveLength(0);
  });

  it("rejects a forged signature", async () => {
    const response = await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=not-a-real-signature")
      .send(JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }));

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid Stripe webhook signature");
    expect(testApp.users.upserts).toHaveLength(0);
  });

  it("activates the subscription on checkout.session.completed", async () => {
    const { body, signature } = signedRequest({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", customer: "cus_123", subscription: "sub_123" } },
    });

    const response = await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true, handled: true });
    expect(testApp.users.user.subscription?.status).toBe("active");
    expect(testApp.users.user.stripeCustomerId).toBe("cus_123");
  });

  it("unlocks nutrition for subsequent searches once the webhook lands", async () => {
    const before = await request(testApp.app).get("/api/products/search").query({ q: "nutella" });
    expect((before.body as SearchResult).products[0]?.nutrition).toBeNull();

    const { body, signature } = signedRequest({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", customer: "cus_123", subscription: "sub_123" } },
    });

    await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);

    const after = await request(testApp.app).get("/api/products/search").query({ q: "nutella" });
    expect((after.body as SearchResult).products[0]?.nutrition?.energyKcal).toBe(539);
  });

  it("stores the paid period end from customer.subscription.updated", async () => {
    const periodEnd = Math.floor(new Date("2099-06-01T00:00:00.000Z").getTime() / 1000);
    const { body, signature } = signedRequest({
      id: "evt_3",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    });

    await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);

    expect(testApp.users.user.subscription?.currentPeriodEnd?.toISOString()).toBe(
      "2099-06-01T00:00:00.000Z",
    );
  });

  it("locks nutrition again when the subscription is deleted", async () => {
    const { body, signature } = signedRequest({
      id: "evt_4",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123", customer: "cus_123", status: "canceled" } },
    });

    await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);

    expect(testApp.users.user.subscription?.status).toBe("canceled");

    const search = await request(testApp.app).get("/api/products/search").query({ q: "nutella" });
    expect((search.body as SearchResult).products[0]?.isNutritionLocked).toBe(true);
  });

  it("acknowledges unrelated events without touching the subscription", async () => {
    const { body, signature } = signedRequest({
      id: "evt_5",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1" } },
    });

    const response = await request(testApp.app)
      .post("/api/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);

    expect(response.body).toEqual({ received: true, handled: false });
    expect(testApp.users.upserts).toHaveLength(0);
  });
});
