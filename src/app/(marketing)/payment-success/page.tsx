import Link from "next/link";
import { z } from "zod";

import { MetaPixelSubscribeEvent } from "@/components/shared/meta-pixel-consent";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getSubscriptionPaymentConfirmation } from "@/server/services/payment";

const paymentIdSchema = z.string().cuid();

type PaymentSuccessPageProps = {
  searchParams: Promise<{ paymentId?: string | string[] }>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const session = await auth();
  const { paymentId: rawPaymentId } = await searchParams;
  const parsedPaymentId = paymentIdSchema.safeParse(rawPaymentId);
  const payment =
    session?.user.id && parsedPaymentId.success
      ? await getSubscriptionPaymentConfirmation(parsedPaymentId.data, session.user.id)
      : null;
  const dashboardHref =
    session?.user.role === "VENDOR"
      ? "/dashboard/vendor"
      : session?.user.role === "BANQUET_OWNER"
        ? "/dashboard/banquet"
        : "/account";

  if (!payment) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16 text-center">
        <h1 className="font-heading text-3xl">Payment not confirmed</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn&apos;t verify a completed subscription payment. If you completed checkout, allow
          a moment for confirmation and check your dashboard before trying again.
        </p>
        <Link href={dashboardHref} className={`${buttonVariants()} mt-6`}>
          Go to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16 text-center">
      <MetaPixelSubscribeEvent eventId={payment.paymentId} valuePaise={payment.amountPaise} />
      <h1 className="font-heading text-3xl">Thank you for subscribing!</h1>
      <p className="mt-3 text-muted-foreground">
        Your payment is confirmed and your subscription is active.
      </p>
      <Link href={dashboardHref} className={`${buttonVariants()} mt-6`}>
        Go to dashboard
      </Link>
    </main>
  );
}
