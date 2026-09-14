/** Small helper kept out of page components on purpose — React Compiler's
 * purity lint flags a direct `Date.now()` call inside a component body. */
export function isSubscriptionExpired(subscription: { currentPeriodEnd: Date } | null): boolean {
  if (!subscription) return false;
  return subscription.currentPeriodEnd.getTime() < Date.now();
}
