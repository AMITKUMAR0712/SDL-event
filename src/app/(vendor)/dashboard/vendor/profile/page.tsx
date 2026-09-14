import { redirect } from "next/navigation";

import { BackButton } from "@/components/shared/back-button";
import { VendorProfileEditForm } from "@/components/shared/vendor-profile-edit-form";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCitiesForSelect } from "@/server/repositories/catalog";

export default async function VendorProfileEditPage() {
  const session = await auth();
  const vendor = session?.user.id
    ? await db.vendorProfile.findUnique({
        where: { userId: session.user.id },
        include: { baseAddress: true },
      })
    : null;

  if (!vendor) redirect("/dashboard/vendor/onboarding");

  const cities = await listCitiesForSelect();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">Edit your business profile</h1>
      <p className="mt-2 text-muted-foreground">
        Changes apply immediately — your listing stays live while you update it.
      </p>
      <div className="mt-8">
        <VendorProfileEditForm
          cities={cities}
          initialValues={{
            businessName: vendor.businessName,
            cityId: vendor.cityId,
            addressLine1: vendor.baseAddress?.line1 ?? "",
            pincode: vendor.baseAddress?.pincode ?? "",
            servesInStudio: vendor.servesInStudio,
            servesAtHome: vendor.servesAtHome,
            homeServiceRadiusKm: vendor.homeServiceRadiusKm,
            gstin: vendor.gstin ?? "",
          }}
        />
      </div>
    </main>
  );
}
