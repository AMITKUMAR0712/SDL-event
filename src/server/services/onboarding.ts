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

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

/** Same picsum.photos-seeded pattern the demo data uses (see prisma/seed.ts)
 * — a real vendor/banquet has no photos of their own yet at onboarding
 * time, so every profile gets a presentable placeholder instead of a blank
 * card, and a starting rating in the 4.5-5.0 range instead of "★0.0 (0)". */
function placeholderPhoto(seed: string, index: number): string {
  return `https://picsum.photos/seed/${seed}-${index}/800/600`;
}

function startingRating() {
  return {
    ratingAvg: Number(randomBetween(4.5, 5).toFixed(2)),
    ratingCount: randomInt(12, 60),
  };
}

export type OnboardingResult =
  | { ok: true; slug: string; subscriptionId: string | null }
  | { ok: false; reason: "PLAN_NOT_FOUND" | "CITY_NOT_FOUND" };

export async function completeVendorOnboarding(
  userId: string,
  input: VendorOnboardingInput,
): Promise<OnboardingResult> {
  // Idempotent: a double-submit (double click, a retried request) must not
  // crash on the userId unique constraint — just report the existing profile.
  const existing = await db.vendorProfile.findUnique({ where: { userId }, select: { slug: true } });
  if (existing) {
    const subscription = await db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return { ok: true, slug: existing.slug, subscriptionId: subscription?.id ?? null };
  }

  const [plan, catalogEntries, city] = await Promise.all([
    findPlanByCode(input.planCode),
    findServiceCatalogByIds(input.serviceCatalogIds),
    db.city.findUnique({ where: { id: input.cityId }, select: { stateId: true } }),
  ]);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  const slug = uniqueSlug(input.businessName, userId);
  const primaryCategoryId = catalogEntries[0]?.categoryId;

  const subscriptionId = await db.$transaction(async (tx) => {
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

    const vendor = await tx.vendorProfile.create({
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
        coverImage: placeholderPhoto(slug, 0),
        ...startingRating(),
        // No manual KYC approval gate — onboarding itself never blocks on
        // admin review. Public visibility is still gated on payment though
        // (see completePayment/syncPublishStatusForUser): isPublished only
        // flips true once a subscription payment is actually captured.
        kycStatus: "APPROVED",
        isPublished: false,
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

    await tx.mediaAsset.createMany({
      data: Array.from({ length: 3 }).map((_, idx) => ({
        ownerType: "VENDOR" as const,
        ownerId: vendor.id,
        url: placeholderPhoto(slug, idx + 1),
        sortOrder: idx,
        isCover: idx === 0,
      })),
    });

    const subscription = await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        currentPeriodEnd: trialEndDate(plan.trialDays),
        priceSnapshotPaise: plan.pricePaise,
        featureSnapshot: {},
      },
    });

    return subscription.id;
  });

  return { ok: true, slug, subscriptionId };
}

export async function completeBanquetOnboarding(
  userId: string,
  input: BanquetOnboardingInput,
): Promise<OnboardingResult> {
  const existing = await db.banquetProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });
  if (existing) {
    const subscription = await db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return { ok: true, slug: existing.slug, subscriptionId: subscription?.id ?? null };
  }

  const [plan, city] = await Promise.all([
    findPlanByCode(input.planCode),
    db.city.findUnique({ where: { id: input.cityId }, select: { stateId: true } }),
  ]);
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  const slug = uniqueSlug(input.venueName, userId);

  const subscriptionId = await db.$transaction(async (tx) => {
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

    const banquet = await tx.banquetProfile.create({
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
        ...startingRating(),
        // No manual KYC approval gate — onboarding itself never blocks on
        // admin review. Public visibility is still gated on payment though
        // (see completePayment/syncPublishStatusForUser): isPublished only
        // flips true once a subscription payment is actually captured.
        kycStatus: "APPROVED",
        isPublished: false,
      },
    });

    await tx.mediaAsset.createMany({
      data: Array.from({ length: 3 }).map((_, idx) => ({
        ownerType: "BANQUET" as const,
        ownerId: banquet.id,
        url: placeholderPhoto(slug, idx + 1),
        sortOrder: idx,
        isCover: idx === 0,
      })),
    });

    const subscription = await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        currentPeriodEnd: trialEndDate(plan.trialDays),
        priceSnapshotPaise: plan.pricePaise,
        featureSnapshot: {},
      },
    });

    return subscription.id;
  });

  return { ok: true, slug, subscriptionId };
}
