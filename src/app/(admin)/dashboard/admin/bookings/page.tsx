import { formatPaiseAsINR } from "@/lib/money";
import { listAllBookings } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await listAllBookings();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Bookings</h1>
      <div className="mt-6 divide-y divide-border rounded-lg border border-border">
        {bookings.slice(0, 50).map((b) => (
          <div key={b.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <p className="font-medium">{b.bookingNo}</p>
              <p className="text-muted-foreground">
                {b.customer.name ?? b.customer.email} · {b.type}
                {b.contactPhone && ` · ${b.contactPhone}`}
              </p>
            </div>
            <div className="text-right">
              <p>{b.status}</p>
              <p className="text-muted-foreground">{formatPaiseAsINR(b.totalPaise)}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
