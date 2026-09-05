import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import type { ProductService } from "../services/product-service";
import { DEFAULT_LOCALE, isLocale, type Locale } from "../types/product";

function readLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function readQuery(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function createProductRoutes(productService: ProductService): Router {
  const router = Router();

  router.get(
    "/search",
    asyncHandler(async (req, res) => {
      const result = await productService.search({
        query: readQuery(req.query.q),
        locale: readLocale(req.query.locale),
      });

      res.json(result);
    }),
  );

  router.get(
    "/:barcode",
    asyncHandler(async (req, res) => {
      const product = await productService.getByBarcode({
        barcode: readQuery(req.params.barcode),
        locale: readLocale(req.query.locale),
      });

      res.json({ product });
    }),
  );

  return router;
}
