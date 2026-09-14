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

export type OnboardingResult =
  { ok: true; slug: string } | { ok: false; reason: "PLAN_NOT_FOUND" | "CITY_NOT_FOUND" };

export async function completeVendorOnboarding(
  userId: string,
  input: VendorOnboardingInput,
): Promise<OnboardingResult> {
  // Idempotent: a double-submit (double click, a retried request) must not
  // crash on the userId unique constraint — just report the existing profile.
  const existing = await db.vendorProfile.findUnique({ where: { userId }, select: { slug: true } });
  if (existing) return { ok: true, slug: existing.slug };

  const [plan, catalogEntries, city] = await Promise.all([
    findPlanByCode(input.planCode),
    findServiceCatalogByIds(input.serviceCatalogIds),
    db.city.findUnique({ where: { id: input.cityId }, select: { stateId: true } }),
  ]);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  const slug = uniqueSlug(input.businessName, userId);
  const primaryCategoryId = catalogEntries[0]?.categoryId;

  await db.$transaction(async (tx) => {
    const address = await tx.address.create({
      data: {
        userId,
        line1: input.addressLine1,
        localityId: input.localityId,
        cityId: input.cityId,
        stateId: city.stateId,
        pincode: input.pincode,
        type: "STUDIO",
      },
    });

    await tx.vendorProfile.create({
      data: {
        userId,
        businessName: input.businessName,
        slug,
        baseAddressId: address.id,
        cityId: input.cityId,
        localityId: input.localityId,
        primaryCategoryId,
        servesInStudio: input.servesInStudio,
        servesAtHome: input.servesAtHome,
        homeServiceRadiusKm: input.servesAtHome ? input.homeServiceRadiusKm : 0,
        gstin: input.gstin,
        panMasked: input.panMasked,
        subscriptionTier: plan.code,
        // No manual KYC approval gate — a vendor completing onboarding goes
        // live immediately. Admin can still unpublish/reject via
        // /dashboard/admin/kyc if a listing turns out to need review.
        kycStatus: "APPROVED",
        isPublished: true,
        publishedAt: new Date(),
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

  const [plan, city] = await Promise.all([
    findPlanByCode(input.planCode),
    db.city.findUnique({ where: { id: input.cityId }, select: { stateId: true } }),
  ]);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  const slug = uniqueSlug(input.venueName, userId);

  await db.$transaction(async (tx) => {
    const address = await tx.address.create({
      data: {
        userId,
        line1: input.addressLine1,
        localityId: input.localityId,
        cityId: input.cityId,
        stateId: city.stateId,
        pincode: input.pincode,
        type: "OTHER",
      },
    });

    await tx.banquetProfile.create({
      data: {
        userId,
        venueName: input.venueName,
        slug,
        addressId: address.id,
        cityId: input.cityId,
        localityId: input.localityId,
        totalHalls: input.totalHalls,
        vegPricePerPlatePaise: input.vegPricePerPlatePaise,
        nonVegPricePerPlatePaise: input.nonVegPricePerPlatePaise,
        // No manual KYC approval gate — a banquet completing onboarding goes
        // live immediately. Admin can still unpublish/reject via
        // /dashboard/admin/kyc if a listing turns out to need review.
        kycStatus: "APPROVED",
        isPublished: true,
        publishedAt: new Date(),
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
