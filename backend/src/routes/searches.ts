import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import type { SearchRepository, UserRepository } from "../repositories/types";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

function readLimit(value: unknown): number {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function createSearchRoutes(users: UserRepository, searches: SearchRepository): Router {
  const router = Router();

  router.get(
    "/recent",
    asyncHandler(async (req, res) => {
      const user = await users.getDemoUser();
      const recent = await searches.recent(user.id, readLimit(req.query.limit));

      res.json({ searches: recent });
    }),
  );

  return router;
}
