import { BookingList } from "@/components/shared/booking-list";
import { listAllBookings } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await listAllBookings();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Bookings</h1>
      <div className="mt-6">
        <BookingList bookings={bookings.slice(0, 50)} />
      </div>
    </main>
  );
}
