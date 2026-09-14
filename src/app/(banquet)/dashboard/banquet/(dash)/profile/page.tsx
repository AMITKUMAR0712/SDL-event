import { redirect } from "next/navigation";

import { BanquetProfileEditForm } from "@/components/shared/banquet-profile-edit-form";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCitiesForSelect } from "@/server/repositories/catalog";

export default async function BanquetProfileEditPage() {
  const session = await auth();
  const banquet = session?.user.id
    ? await db.banquetProfile.findUnique({
        where: { userId: session.user.id },
        include: { address: true },
      })
    : null;

  if (!banquet) redirect("/dashboard/banquet/onboarding");

  const cities = await listCitiesForSelect();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">Edit your venue profile</h1>
      <p className="mt-2 text-muted-foreground">
        Changes apply immediately — your listing stays live while you update it.
      </p>
      <div className="mt-8">
        <BanquetProfileEditForm
          cities={cities}
          initialValues={{
            venueName: banquet.venueName,
            cityId: banquet.cityId,
            addressLine1: banquet.address?.line1 ?? "",
            pincode: banquet.address?.pincode ?? "",
            totalHalls: banquet.totalHalls,
            vegPricePerPlatePaise: banquet.vegPricePerPlatePaise ?? 0,
            nonVegPricePerPlatePaise: banquet.nonVegPricePerPlatePaise ?? 0,
            gstin: banquet.gstin ?? "",
          }}
        />
      </div>
    </main>
  );
}
