import { BackButton } from "@/components/shared/back-button";
import { BookingActions } from "@/components/shared/booking-actions";
import { auth } from "@/lib/auth";
import { formatPaiseAsINR } from "@/lib/money";
import { findBookingsForOwner } from "@/server/repositories/booking";

export default async function VendorBookingsPage() {
  const session = await auth();
  if (!session?.user.vendorId) {
    return <main className="mx-auto max-w-3xl px-6 py-12">Complete onboarding first.</main>;
  }

  const bookings = await findBookingsForOwner("VENDOR", session.user.vendorId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">Bookings</h1>
      <div className="mt-6 space-y-3">
        {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {b.bookingNo} · {b.customer.name ?? b.customer.phone}
              </p>
              <span className="text-sm text-muted-foreground">{b.status}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(b.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} ·{" "}
              {formatPaiseAsINR(b.totalPaise)}
            </p>
            <div className="mt-3">
              <BookingActions bookingId={b.id} status={b.status} actorRole="OWNER" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
