import { BackButton } from "@/components/shared/back-button";
import { BanquetOnboardingWizard } from "@/components/shared/banquet-onboarding-wizard";
import { listCitiesForSelect, listPlansForAudience } from "@/server/repositories/catalog";

export default async function BanquetOnboardingPage() {
  const [cities, plans] = await Promise.all([
    listCitiesForSelect(),
    listPlansForAudience("BANQUET"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">Set up your venue</h1>
      <p className="mt-2 text-muted-foreground">
        A few steps to get your listing ready for admin review.
      </p>
      <div className="mt-8">
        <BanquetOnboardingWizard cities={cities} plans={plans} />
      </div>
    </main>
  );
}
