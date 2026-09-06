import { VendorOnboardingWizard } from "@/components/shared/vendor-onboarding-wizard";
import {
  listBeautyServiceCatalog,
  listCitiesForSelect,
  listPlansForAudience,
} from "@/server/repositories/catalog";

export default async function VendorOnboardingPage() {
  const [cities, serviceCatalog, plans] = await Promise.all([
    listCitiesForSelect(),
    listBeautyServiceCatalog(),
    listPlansForAudience("VENDOR"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">Set up your business</h1>
      <p className="mt-2 text-muted-foreground">
        A few steps to get your profile ready for admin review.
      </p>
      <div className="mt-8">
        <VendorOnboardingWizard cities={cities} serviceCatalog={serviceCatalog} plans={plans} />
      </div>
    </main>
  );
}
