import { PlanForm } from "@/components/shared/plan-form";
import { formatPaiseAsINR } from "@/lib/money";
import { listAllPlans } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "3 months",
  HALF_YEARLY: "6 months",
  YEARLY: "12 months",
};

export default async function AdminPlansPage() {
  const plans = await listAllPlans();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Subscription plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Plans and their features shown to vendors, banquet owners, and customers.
      </p>

      <div className="mt-6">
        <PlanForm />
      </div>

      <div className="mt-8 space-y-2">
        {plans.map((plan) => (
          <details key={plan.id} className="rounded-lg border border-border">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{plan.audience}</span>
                {plan.name}
                <span className="text-muted-foreground">
                  · {formatPaiseAsINR(plan.pricePaise)} / {PERIOD_LABEL[plan.billingPeriod]}
                </span>
              </span>
              <span className={plan.isActive ? "text-accent-foreground" : "text-muted-foreground"}>
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-border p-3">
              <PlanForm plan={plan} />
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
