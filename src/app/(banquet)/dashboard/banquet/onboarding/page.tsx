import { BackButton } from "@/components/shared/back-button";
import { BanquetOnboardingWizard } from "@/components/shared/banquet-onboarding-wizard";
import { auth } from "@/lib/auth";
import { listActivePlansWithFeatures, listCitiesForSelect } from "@/server/repositories/catalog";

export default async function BanquetOnboardingPage() {
  const [session, cities, plans] = await Promise.all([
    auth(),
    listCitiesForSelect(),
    listActivePlansWithFeatures("BANQUET"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <BackButton className="mb-4" />
      <h1 className="font-heading text-3xl">Set up your venue</h1>
      <p className="mt-2 text-muted-foreground">
        A few steps and your listing goes live — no waiting on approval.
      </p>
      <div className="mt-8">
        <BanquetOnboardingWizard
          cities={cities}
          plans={plans}
          accountName={session?.user.name ?? null}
          accountEmail={session?.user.email ?? null}
        />
      </div>
    </main>
  );
}
