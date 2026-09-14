import { CouponForm } from "@/components/shared/coupon-form";
import { listAllCoupons } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listAllCoupons();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Coupons</h1>
      <div className="mt-6">
        <CouponForm />
      </div>
      <div className="mt-8 space-y-2">
        {coupons.map((c) => (
          <details key={c.id} className="rounded-lg border border-border">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
              <span className="font-mono">{c.code}</span>
              <span className="text-muted-foreground">
                {c.discountType === "PERCENT" ? `${c.value}%` : `₹${c.value / 100}`} · {c.appliesTo}{" "}
                · {c.ownerType}
              </span>
              <span className={c.isActive ? "text-accent-foreground" : "text-muted-foreground"}>
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-border p-3">
              <CouponForm coupon={c} />
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
