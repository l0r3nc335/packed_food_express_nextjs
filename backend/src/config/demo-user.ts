/**
 * The assignment scopes this to a single demo user, so there is no auth layer.
 * Every request is attributed to this account.
 */
export const DEMO_USER = {
  email: "demo@example.com",
  name: "Demo User",
} as const;
