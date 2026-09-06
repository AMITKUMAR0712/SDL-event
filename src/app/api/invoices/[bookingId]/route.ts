import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderInvoicePdf } from "@/server/services/invoice";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Sign in required", { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { customerId: true, ownerType: true, ownerId: true },
  });
  if (!booking) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id, role, vendorId, banquetId } = session.user;
  const isAdmin = role === "ADMIN" || role === "SUPPORT";
  const isCustomer = id === booking.customerId;
  const isOwner =
    (booking.ownerType === "VENDOR" && vendorId === booking.ownerId) ||
    (booking.ownerType === "BANQUET" && banquetId === booking.ownerId);
  if (!isAdmin && !isCustomer && !isOwner) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const pdf = await renderInvoicePdf(bookingId);
  if (!pdf) {
    return new NextResponse("Invoice not yet generated — booking isn't completed yet", {
      status: 404,
    });
  }

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${bookingId}.pdf"`,
    },
  });
}
