import type { PrismaClient } from "@prisma/client";
import { dedupeRecentSearches } from "../services/recent-searches";
import type { RecentSearch } from "../types/product";
import type { SearchRecordInput, SearchRepository } from "./types";

export function createPrismaSearchRepository(prisma: PrismaClient): SearchRepository {
  return {
    async record(input: SearchRecordInput): Promise<void> {
      await prisma.searchQuery.create({
        data: {
          userId: input.userId,
          term: input.term,
          locale: input.locale,
          resultCount: input.resultCount,
        },
      });
    },

    async recent(userId: string, limit: number): Promise<RecentSearch[]> {
      const rows = await prisma.searchQuery.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        // Over-fetch so duplicates can be collapsed while still filling the list.
        take: limit * 4,
      });

      return dedupeRecentSearches(rows, limit);
    },
  };
}
