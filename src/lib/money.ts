/**
 * Money is always an integer number of paise (1 rupee = 100 paise).
 * Never store or compute money as a float — use these helpers at the
 * display edge only.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaiseAsINR(paise: number): string {
  return INR_FORMATTER.format(paiseToRupees(paise));
}

export function addPaise(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

export function percentOfPaise(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}
