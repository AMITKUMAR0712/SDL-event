import { KycActions } from "@/components/shared/kyc-actions";
import { listPendingBanquetKyc, listPendingVendorKyc } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  const [vendors, banquets] = await Promise.all([listPendingVendorKyc(), listPendingBanquetKyc()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">KYC review</h1>

      <h2 className="mt-8 font-heading text-xl">Vendors ({vendors.length})</h2>
      <div className="mt-2 space-y-3">
        {vendors.length === 0 && <p className="text-muted-foreground">Nothing pending.</p>}
        {vendors.map((v) => (
          <div key={v.id} className="rounded-lg border border-border p-4">
            <p className="font-medium">{v.businessName}</p>
            <p className="text-sm text-muted-foreground">
              {v.user.name} · {v.user.email} · {v.user.phone} · {v.city.name}
            </p>
            {v.gstin && <p className="text-sm text-muted-foreground">GSTIN: {v.gstin}</p>}
            <div className="mt-3">
              <KycActions type="VENDOR" id={v.id} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-heading text-xl">Banquets ({banquets.length})</h2>
      <div className="mt-2 space-y-3">
        {banquets.length === 0 && <p className="text-muted-foreground">Nothing pending.</p>}
        {banquets.map((b) => (
          <div key={b.id} className="rounded-lg border border-border p-4">
            <p className="font-medium">{b.venueName}</p>
            <p className="text-sm text-muted-foreground">
              {b.user.name} · {b.user.email} · {b.user.phone} · {b.city.name}
            </p>
            <div className="mt-3">
              <KycActions type="BANQUET" id={b.id} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
