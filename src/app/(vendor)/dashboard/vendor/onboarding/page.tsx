import { BackButton } from "@/components/shared/back-button";
import { VendorOnboardingWizard } from "@/components/shared/vendor-onboarding-wizard";
import { auth } from "@/lib/auth";
import {
  listActivePlansWithFeatures,
  listBeautyServiceCatalog,
  listCitiesForSelect,
} from "@/server/repositories/catalog";

export default async function VendorOnboardingPage() {
  const [session, cities, serviceCatalog, plans] = await Promise.all([
    auth(),
    listCitiesForSelect(),
    listBeautyServiceCatalog(),
    listActivePlansWithFeatures("VENDOR"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">Set up your business</h1>
      <p className="mt-2 text-muted-foreground">
        A few steps and your listing goes live — no waiting on approval.
      </p>
      <div className="mt-8">
        <VendorOnboardingWizard
          cities={cities}
          serviceCatalog={serviceCatalog}
          plans={plans}
          accountName={session?.user.name ?? null}
          accountEmail={session?.user.email ?? null}
        />
      </div>
    </main>
  );
}
