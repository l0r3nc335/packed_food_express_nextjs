import { DEFAULT_LOCALE, isLocale, type RecentSearch } from "../types/product";

export type RecentSearchRow = {
  id: string;
  term: string;
  locale: string;
  resultCount: number;
  createdAt: Date;
};

/**
 * Collapses repeated terms so the chips stay useful, keeping the newest entry
 * of each term. Rows are expected newest-first.
 */
export function dedupeRecentSearches(rows: readonly RecentSearchRow[], limit: number): RecentSearch[] {
  const seen = new Set<string>();
  const recent: RecentSearch[] = [];

  for (const row of rows) {
    const key = row.term.trim().toLowerCase();
    if (key === "" || seen.has(key)) continue;
    seen.add(key);

    recent.push({
      id: row.id,
      term: row.term,
      locale: isLocale(row.locale) ? row.locale : DEFAULT_LOCALE,
      resultCount: row.resultCount,
      createdAt: row.createdAt.toISOString(),
    });

    if (recent.length >= limit) break;
  }

  return recent;
}
