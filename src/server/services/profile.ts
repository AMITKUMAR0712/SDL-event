import { db } from "@/lib/db";
import type { BanquetProfileEditInput, VendorProfileEditInput } from "@/schemas/profile";

export type ProfileUpdateResult =
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "CITY_NOT_FOUND" };

export async function updateVendorProfile(
  userId: string,
  input: VendorProfileEditInput,
): Promise<ProfileUpdateResult> {
  const [vendor, city] = await Promise.all([
    db.vendorProfile.findUnique({ where: { userId }, select: { id: true, baseAddressId: true } }),
    db.city.findUnique({ where: { id: input.cityId }, select: { id: true, stateId: true } }),
  ]);
  if (!vendor) return { ok: false, reason: "NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  await db.$transaction(async (tx) => {
    if (vendor.baseAddressId) {
      await tx.address.update({
        where: { id: vendor.baseAddressId },
        data: {
          line1: input.addressLine1,
          pincode: input.pincode,
          cityId: city.id,
          stateId: city.stateId,
        },
      });
    }
    await tx.vendorProfile.update({
      where: { userId },
      data: {
        businessName: input.businessName,
        cityId: city.id,
        servesInStudio: input.servesInStudio,
        servesAtHome: input.servesAtHome,
        homeServiceRadiusKm: input.servesAtHome ? input.homeServiceRadiusKm : 0,
        gstin: input.gstin || null,
      },
    });
  });

  return { ok: true };
}

export async function updateBanquetProfile(
  userId: string,
  input: BanquetProfileEditInput,
): Promise<ProfileUpdateResult> {
  const [banquet, city] = await Promise.all([
    db.banquetProfile.findUnique({ where: { userId }, select: { id: true, addressId: true } }),
    db.city.findUnique({ where: { id: input.cityId }, select: { id: true, stateId: true } }),
  ]);
  if (!banquet) return { ok: false, reason: "NOT_FOUND" };
  if (!city) return { ok: false, reason: "CITY_NOT_FOUND" };

  await db.$transaction(async (tx) => {
    if (banquet.addressId) {
      await tx.address.update({
        where: { id: banquet.addressId },
        data: {
          line1: input.addressLine1,
          pincode: input.pincode,
          cityId: city.id,
          stateId: city.stateId,
        },
      });
    }
    await tx.banquetProfile.update({
      where: { userId },
      data: {
        venueName: input.venueName,
        cityId: city.id,
        totalHalls: input.totalHalls,
        vegPricePerPlatePaise: input.vegPricePerPlatePaise,
        nonVegPricePerPlatePaise: input.nonVegPricePerPlatePaise,
        gstin: input.gstin || null,
      },
    });
  });

  return { ok: true };
}
