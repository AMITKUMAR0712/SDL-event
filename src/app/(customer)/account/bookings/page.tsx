import { BackButton } from "@/components/shared/back-button";
import { BookingActions } from "@/components/shared/booking-actions";
import { PayNowButton } from "@/components/shared/pay-now-button";
import { ReviewForm } from "@/components/shared/review-form";
import { auth } from "@/lib/auth";
import { formatPaiseAsINR } from "@/lib/money";
import { findBookingsForCustomer } from "@/server/repositories/booking";

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const bookings = await findBookingsForCustomer(session.user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">My bookings</h1>
      <div className="mt-6 space-y-3">
        {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{b.bookingNo}</p>
              <span className="text-sm text-muted-foreground">{b.status}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(b.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
            <p className="mt-1 text-sm">Total: {formatPaiseAsINR(b.totalPaise)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <BookingActions bookingId={b.id} status={b.status} actorRole="CUSTOMER" />
              {b.status === "PENDING" && <PayNowButton bookingId={b.id} />}
              {b.status === "COMPLETED" && (
                <a
                  href={`/api/invoices/${b.id}`}
                  className="text-sm font-medium underline underline-offset-2"
                >
                  Download invoice
                </a>
              )}
            </div>
            {b.status === "COMPLETED" && !b.review && <ReviewForm bookingId={b.id} />}
          </div>
        ))}
      </div>
    </main>
  );
}
