import { db } from "@/lib/db";
import type { BanquetOnboardingInput, VendorOnboardingInput } from "@/schemas/onboarding";
import { findPlanByCode, findServiceCatalogByIds } from "@/server/repositories/catalog";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(base: string, userId: string): string {
  return `${slugify(base)}-${userId.slice(-6)}`;
}

function trialEndDate(trialDays: number): Date {
  const days = trialDays > 0 ? trialDays : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export type OnboardingResult = { ok: true; slug: string } | { ok: false; reason: "PLAN_NOT_FOUND" };

export async function completeVendorOnboarding(
  userId: string,
  input: VendorOnboardingInput,
): Promise<OnboardingResult> {
  // Idempotent: a double-submit (double click, a retried request) must not
  // crash on the userId unique constraint — just report the existing profile.
  const existing = await db.vendorProfile.findUnique({ where: { userId }, select: { slug: true } });
  if (existing) return { ok: true, slug: existing.slug };

  const [plan, catalogEntries] = await Promise.all([
    findPlanByCode(input.planCode),
    findServiceCatalogByIds(input.serviceCatalogIds),
  ]);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };

  const slug = uniqueSlug(input.businessName, userId);
  const primaryCategoryId = catalogEntries[0]?.categoryId;

  await db.$transaction(async (tx) => {
    await tx.vendorProfile.create({
      data: {
        userId,
        businessName: input.businessName,
        slug,
        cityId: input.cityId,
        localityId: input.localityId,
        primaryCategoryId,
        servesInStudio: input.servesInStudio,
        servesAtHome: input.servesAtHome,
        homeServiceRadiusKm: input.servesAtHome ? input.homeServiceRadiusKm : 0,
        gstin: input.gstin,
        panMasked: input.panMasked,
        subscriptionTier: plan.code,
        services: {
          create: catalogEntries.map((entry) => ({
            serviceCatalogId: entry.id,
            title: entry.name,
            pricePaise: 0,
            durationMin: entry.defaultDurationMin,
          })),
        },
      },
    });

    await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        currentPeriodEnd: trialEndDate(plan.trialDays),
        priceSnapshotPaise: plan.pricePaise,
        featureSnapshot: {},
      },
    });
  });

  return { ok: true, slug };
}

export async function completeBanquetOnboarding(
  userId: string,
  input: BanquetOnboardingInput,
): Promise<OnboardingResult> {
  const existing = await db.banquetProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });
  if (existing) return { ok: true, slug: existing.slug };

  const plan = await findPlanByCode(input.planCode);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };

  const slug = uniqueSlug(input.venueName, userId);

  await db.$transaction(async (tx) => {
    await tx.banquetProfile.create({
      data: {
        userId,
        venueName: input.venueName,
        slug,
        cityId: input.cityId,
        localityId: input.localityId,
        totalHalls: input.totalHalls,
        vegPricePerPlatePaise: input.vegPricePerPlatePaise,
        nonVegPricePerPlatePaise: input.nonVegPricePerPlatePaise,
      },
    });

    await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        currentPeriodEnd: trialEndDate(plan.trialDays),
        priceSnapshotPaise: plan.pricePaise,
        featureSnapshot: {},
      },
    });
  });

  return { ok: true, slug };
}
