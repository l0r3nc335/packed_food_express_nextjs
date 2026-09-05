import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { BillingError, NotFoundError } from "../lib/errors";
import type { BillingService } from "../services/billing";
import { DEFAULT_LOCALE, isLocale } from "../types/product";

export type BillingRouteOptions = {
  frontendUrl: string;
};

/** Rejects anything that would turn the stub redirect into an open redirect. */
function assertInternalRedirect(target: string, frontendUrl: string): string {
  if (!URL.canParse(target) || !target.startsWith(frontendUrl)) {
    throw new BillingError("Redirect target is not allowed");
  }
  return target;
}

export function createBillingRoutes(
  billingService: BillingService,
  options: BillingRouteOptions,
): Router {
  const router = Router();
  const { frontendUrl } = options;

  router.post(
    "/checkout",
    asyncHandler(async (req, res) => {
      const body = req.body as { locale?: unknown } | undefined;
      const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;

      const session = await billingService.startCheckout({
        successUrl: `${frontendUrl}/${locale}?checkout=success`,
        cancelUrl: `${frontendUrl}/${locale}?checkout=canceled`,
        apiBaseUrl: `${req.protocol}://${req.get("host") ?? "localhost"}`,
      });

      res.json({ url: session.url, sessionId: session.sessionId, mode: billingService.mode });
    }),
  );

  /**
   * Stub-only endpoints standing in for Stripe Checkout and cancellation so the
   * paywall can be demonstrated without keys. They 404 in real Stripe mode.
   */
  router.get(
    "/stub/complete",
    asyncHandler(async (req, res) => {
      if (billingService.mode !== "stub") {
        throw new NotFoundError("Stub checkout is disabled while Stripe is configured");
      }

      const redirect =
        typeof req.query.redirect === "string" ? req.query.redirect : `${frontendUrl}/`;

      await billingService.setStubSubscription("active");
      res.redirect(assertInternalRedirect(redirect, frontendUrl));
    }),
  );

  router.post(
    "/stub/cancel",
    asyncHandler(async (_req, res) => {
      if (billingService.mode !== "stub") {
        throw new NotFoundError("Stub cancellation is disabled while Stripe is configured");
      }

      await billingService.setStubSubscription("canceled");
      res.json({ status: "canceled" });
    }),
  );

  return router;
}
