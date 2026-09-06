import { CreateCouponForm } from "@/components/shared/create-coupon-form";
import { listAllCoupons } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listAllCoupons();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Coupons</h1>
      <div className="mt-6">
        <CreateCouponForm />
      </div>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-mono">{c.code}</span>
            <span>
              {c.discountType === "PERCENT" ? `${c.value}%` : `₹${c.value / 100}`} · {c.appliesTo} ·{" "}
              {c.ownerType}
            </span>
            <span className={c.isActive ? "text-accent-foreground" : "text-muted-foreground"}>
              {c.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
