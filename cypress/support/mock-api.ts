import { createServer, type ServerResponse } from "node:http";

type MockState = {
  isSubscribed: boolean;
  shouldCheckoutFail: boolean;
  recentSearches: Array<{
    id: string;
    term: string;
    locale: string;
    resultCount: number;
    createdAt: string;
  }>;
};

const productNames: Record<string, string> = {
  en: "Chocolate spread",
  nl: "Chocoladepasta",
  de: "Schokoladenaufstrich",
  fr: "Pâte à tartiner au chocolat",
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "http://localhost:3100",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(302, { Location: location });
  response.end();
}

export function createMockApiServer(port: number): { close(): Promise<void> } {
  const initialState = (): MockState => ({
    isSubscribed: false,
    shouldCheckoutFail: false,
    recentSearches: [],
  });
  let state = initialState();

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);

    if (request.method === "OPTIONS") {
      sendJson(response, 204, null);
      return;
    }

    if (request.method === "POST" && url.pathname === "/__e2e/reset") {
      state = initialState();
      sendJson(response, 200, { status: "reset" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/__e2e/fail-checkout") {
      state.shouldCheckoutFail = true;
      sendJson(response, 200, { status: "configured" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/__e2e/seed-recent") {
      state.recentSearches = [
        {
          id: "recent-1",
          term: "yoghurt",
          locale: "en",
          resultCount: 1,
          createdAt: "2026-09-05T00:00:00.000Z",
        },
      ];
      sendJson(response, 200, { status: "seeded" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me") {
      sendJson(response, 200, {
        billingMode: "stub",
        user: {
          id: "demo-user",
          email: "demo@example.com",
          name: "Demo User",
          subscription: {
            status: state.isSubscribed ? "active" : "none",
            isActive: state.isSubscribed,
            currentPeriodEnd: state.isSubscribed ? "2026-10-05T00:00:00.000Z" : null,
          },
        },
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/searches/recent") {
      sendJson(response, 200, { searches: state.recentSearches });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/products/search") {
      const query = (url.searchParams.get("q") ?? "").trim();
      const locale = url.searchParams.get("locale") ?? "en";

      if (query.toLowerCase() === "error") {
        sendJson(response, 502, {
          error: { code: "upstream_error", message: "Fixture search failure" },
        });
        return;
      }

      if (query.toLowerCase() === "empty") {
        sendJson(response, 200, {
          query,
          locale,
          count: 0,
          isSubscribed: state.isSubscribed,
          products: [],
        });
        return;
      }

      const nutrition = {
        energyKcal: 539,
        fat: 30.9,
        saturatedFat: 10.6,
        carbohydrates: 57.5,
        sugars: 56.3,
        fiber: null,
        proteins: 6.3,
        salt: 0.107,
        servingSize: "15 g",
        nutriScore: "E",
      };
      const products = [
        {
          barcode: "3017620422003",
          name: productNames[locale] ?? productNames.en,
          brand: "Demo Brand",
          imageUrl: null,
          quantity: "400 g",
          categories: "Spreads",
          isNutritionLocked: !state.isSubscribed,
          nutrition: state.isSubscribed ? nutrition : null,
        },
        {
          barcode: "5000112637922",
          name: null,
          brand: null,
          imageUrl: null,
          quantity: null,
          categories: null,
          isNutritionLocked: !state.isSubscribed,
          nutrition: null,
        },
      ];

      state.recentSearches = [
        {
          id: `recent-${query.toLowerCase()}`,
          term: query,
          locale,
          resultCount: products.length,
          createdAt: new Date().toISOString(),
        },
        ...state.recentSearches.filter(
          (search) => search.term.toLowerCase() !== query.toLowerCase(),
        ),
      ];
      sendJson(response, 200, {
        query,
        locale,
        count: products.length,
        isSubscribed: state.isSubscribed,
        products,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/billing/checkout") {
      if (state.shouldCheckoutFail) {
        sendJson(response, 502, {
          error: { code: "billing_error", message: "Fixture checkout failure" },
        });
        return;
      }

      const redirectUrl = "http://localhost:3100/en?checkout=success&session_id=fixture-session";
      sendJson(response, 200, {
        sessionId: "fixture-session",
        url: `http://localhost:${port}/api/billing/stub/complete?redirect=${encodeURIComponent(redirectUrl)}`,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/billing/confirm") {
      // Stub E2E path already activates via stub/complete; confirm is a no-op heal.
      sendJson(response, 200, {
        applied: state.isSubscribed,
        status: state.isSubscribed ? "active" : null,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/billing/stub/complete") {
      state.isSubscribed = true;
      redirect(response, url.searchParams.get("redirect") ?? "http://localhost:3100/en");
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/billing/stub/cancel") {
      state.isSubscribed = false;
      sendJson(response, 200, { status: "canceled" });
      return;
    }

    sendJson(response, 404, { error: { code: "not_found", message: "Fixture route not found" } });
  });

  server.listen(port);

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}
