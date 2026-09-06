import { faker } from "@faker-js/faker";
import {
  AddressType,
  BillingPeriod,
  BookingStatus,
  BookingType,
  CategoryType,
  CouponAppliesTo,
  CouponDiscountType,
  CouponOwnerType,
  KycStatus,
  NotificationChannel,
  NotificationStatus,
  PaymentProvider,
  PaymentStatus,
  PlanAudience,
  PrismaClient,
  ProfileOwnerType,
  ReviewStatus,
  Role,
  SubscriptionStatus,
  UnlockSource,
  VendorServiceMode,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

faker.seed(42);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function timeOfDay(hour: number, minute = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

function pick<T>(arr: readonly T[]): T {
  return faker.helpers.arrayElement(arr);
}

function pickMany<T>(arr: readonly T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, Math.min(count, arr.length));
}

function placeholderPhoto(seed: string, index: number): string {
  return `https://picsum.photos/seed/${slugify(seed)}-${index}/800/600`;
}

/** Small random offset (±~radiusKm) around a center point, for demo coordinates. */
function jitterLatLng(lat: number, lng: number, radiusKm: number) {
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = kmPerDegreeLat * Math.cos((lat * Math.PI) / 180);
  const dLat = (Math.random() * 2 - 1) * (radiusKm / kmPerDegreeLat);
  const dLng = (Math.random() * 2 - 1) * (radiusKm / Math.max(kmPerDegreeLng, 1));
  return { lat: lat + dLat, lng: lng + dLng };
}

let phoneCounter = 6000000000;
function nextIndianPhone(): string {
  phoneCounter += 1;
  return `+91${phoneCounter}`;
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const STATES = [
  "Delhi",
  "Uttar Pradesh",
  "Haryana",
  "Maharashtra",
  "Karnataka",
  "Telangana",
  "Tamil Nadu",
  "West Bengal",
  "Gujarat",
  "Rajasthan",
] as const;

const CITIES: {
  name: string;
  state: (typeof STATES)[number];
  lat: number;
  lng: number;
  population: number;
}[] = [
  { name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, population: 32900000 },
  { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391, population: 700000 },
  { name: "Greater Noida", state: "Uttar Pradesh", lat: 28.4744, lng: 77.504, population: 300000 },
  { name: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538, population: 2400000 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, population: 3600000 },
  { name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, population: 1150000 },
  { name: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178, population: 1800000 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, population: 20400000 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, population: 7400000 },
  { name: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781, population: 1900000 },
  { name: "Navi Mumbai", state: "Maharashtra", lat: 19.033, lng: 73.0297, population: 1200000 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, population: 13200000 },
  { name: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, population: 1000000 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, population: 10500000 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, population: 11500000 },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, population: 2200000 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, population: 14900000 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, population: 8400000 },
  { name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, population: 6900000 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, population: 3900000 },
];

const LOCALITY_NAME_PATTERNS = [
  "Sector {n}",
  "Phase {n}",
  "{name} Nagar",
  "{name} Colony",
  "Civil Lines",
  "{name} Park",
  "Model Town",
  "{name} Enclave",
];

const BEAUTY_CATEGORIES = [
  "Bridal Makeup",
  "Party Makeup",
  "Hair Styling",
  "Hair Coloring",
  "Facial & Skincare",
  "Mehendi Artist",
  "Nail Art",
  "Waxing & Threading",
  "Salon for Men",
  "Spa & Massage",
  "Saree Draping",
] as const;

const BANQUET_CATEGORIES = [
  "Banquet Halls",
  "Marriage Gardens",
  "Farmhouses",
  "Wedding Resorts",
] as const;

const SERVICE_CATALOG_BY_CATEGORY: Record<
  string,
  { name: string; durationMin: number; homeEligible: boolean }[]
> = {
  "Bridal Makeup": [
    { name: "Bridal Makeup - HD", durationMin: 120, homeEligible: true },
    { name: "Bridal Makeup - Airbrush", durationMin: 150, homeEligible: true },
  ],
  "Party Makeup": [{ name: "Party Makeup", durationMin: 60, homeEligible: true }],
  "Hair Styling": [{ name: "Hair Styling & Blow Dry", durationMin: 45, homeEligible: true }],
  "Hair Coloring": [{ name: "Global Hair Color", durationMin: 90, homeEligible: false }],
  "Facial & Skincare": [
    { name: "Classic Facial", durationMin: 60, homeEligible: true },
    { name: "Advanced Facial", durationMin: 75, homeEligible: false },
  ],
  "Mehendi Artist": [
    { name: "Bridal Mehendi", durationMin: 120, homeEligible: true },
    { name: "Simple Mehendi", durationMin: 30, homeEligible: true },
  ],
  "Nail Art": [
    { name: "Nail Extension", durationMin: 60, homeEligible: false },
    { name: "Nail Art Design", durationMin: 45, homeEligible: true },
  ],
  "Waxing & Threading": [
    { name: "Full Body Waxing", durationMin: 60, homeEligible: true },
    { name: "Eyebrow Threading", durationMin: 15, homeEligible: true },
  ],
  "Salon for Men": [
    { name: "Men's Haircut", durationMin: 30, homeEligible: true },
    { name: "Beard Styling", durationMin: 20, homeEligible: true },
  ],
  "Spa & Massage": [{ name: "Full Body Massage", durationMin: 60, homeEligible: true }],
  "Saree Draping": [{ name: "Saree Draping", durationMin: 30, homeEligible: true }],
};

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedTaxonomy() {
  const stateRecords = await Promise.all(
    STATES.map((name) => db.state.create({ data: { name, slug: slugify(name) } })),
  );
  const stateByName = new Map(stateRecords.map((s) => [s.name, s]));

  const cityRecords = [];
  for (const city of CITIES) {
    const state = stateByName.get(city.state);
    if (!state) throw new Error(`Unknown state ${city.state}`);

    const created = await db.city.create({
      data: {
        slug: slugify(city.name),
        name: city.name,
        stateId: state.id,
        lat: city.lat,
        lng: city.lng,
        population: city.population,
        seoTitle: `Beauty & Banquet Services in ${city.name}`,
        seoDescription: `Discover verified beauty vendors and banquet venues in ${city.name} on MakeGlowOver.`,
        introContent: `${city.name} is one of MakeGlowOver's launch cities, with salons, makeup artists, and banquet venues across every major locality.`,
      },
    });
    cityRecords.push({ ...created, lat: city.lat, lng: city.lng });

    // 3 localities per city.
    for (let i = 0; i < 3; i += 1) {
      const pattern = pick(LOCALITY_NAME_PATTERNS);
      const name = pattern
        .replace("{n}", String(faker.number.int({ min: 1, max: 90 })))
        .replace("{name}", faker.location.county().split(" ")[0] ?? "Green");
      const { lat, lng } = jitterLatLng(city.lat, city.lng, 8);
      await db.locality.create({
        data: {
          slug: slugify(`${name}-${i}`),
          name,
          cityId: created.id,
          lat,
          lng,
          pincode: faker.location.zipCode("######"),
        },
      });
    }
  }

  const categoryRecords = [];
  for (const name of BEAUTY_CATEGORIES) {
    categoryRecords.push(
      await db.category.create({
        data: {
          slug: slugify(name),
          name,
          type: CategoryType.BEAUTY,
          seoTitle: `${name} Near You`,
          seoDescription: `Find and book the best ${name.toLowerCase()} professionals near you.`,
          longDescription: faker.lorem.paragraph(),
          sortOrder: BEAUTY_CATEGORIES.indexOf(name),
        },
      }),
    );
  }
  for (const name of BANQUET_CATEGORIES) {
    categoryRecords.push(
      await db.category.create({
        data: {
          slug: slugify(name),
          name,
          type: CategoryType.BANQUET,
          seoTitle: `${name} Near You`,
          seoDescription: `Find and book the best ${name.toLowerCase()} for your event.`,
          longDescription: faker.lorem.paragraph(),
          sortOrder: BANQUET_CATEGORIES.indexOf(name),
        },
      }),
    );
  }

  const serviceCatalogRecords = [];
  for (const category of categoryRecords) {
    const entries = SERVICE_CATALOG_BY_CATEGORY[category.name];
    if (!entries) continue;
    for (const entry of entries) {
      serviceCatalogRecords.push(
        await db.serviceCatalog.create({
          data: {
            slug: slugify(entry.name),
            name: entry.name,
            categoryId: category.id,
            defaultDurationMin: entry.durationMin,
            isHomeServiceEligible: entry.homeEligible,
          },
        }),
      );
    }
  }

  return {
    cities: cityRecords,
    categories: categoryRecords,
    serviceCatalogs: serviceCatalogRecords,
  };
}

async function seedPlans() {
  const vendorPlans = [
    { code: "VENDOR_STARTER", name: "Starter", pricePaise: 99_900, trialDays: 90 },
    { code: "VENDOR_GROWTH", name: "Growth", pricePaise: 199_900, trialDays: 14 },
    { code: "VENDOR_PRO", name: "Pro", pricePaise: 349_900, trialDays: 7 },
    { code: "VENDOR_ELITE", name: "Elite", pricePaise: 599_900, trialDays: 0 },
  ];
  const banquetPlans = [
    { code: "BANQUET_STARTER", name: "Starter", pricePaise: 149_900, trialDays: 90 },
    { code: "BANQUET_GROWTH", name: "Growth", pricePaise: 299_900, trialDays: 14 },
    { code: "BANQUET_PRO", name: "Pro", pricePaise: 499_900, trialDays: 7 },
    { code: "BANQUET_ELITE", name: "Elite", pricePaise: 799_900, trialDays: 0 },
  ];
  const customerPlans = [
    {
      code: "PLUS_MONTHLY",
      name: "MakeGlowOver Plus (Monthly)",
      pricePaise: 9_900,
      period: BillingPeriod.MONTHLY,
    },
    {
      code: "PLUS_QUARTERLY",
      name: "MakeGlowOver Plus (Quarterly)",
      pricePaise: 24_900,
      period: BillingPeriod.QUARTERLY,
    },
    {
      code: "PLUS_YEARLY",
      name: "MakeGlowOver Plus (Yearly)",
      pricePaise: 89_900,
      period: BillingPeriod.YEARLY,
    },
  ];

  const plans = [];

  for (const [i, p] of vendorPlans.entries()) {
    const plan = await db.subscriptionPlan.create({
      data: {
        audience: PlanAudience.VENDOR,
        code: p.code,
        name: p.name,
        description: `${p.name} plan for beauty vendors.`,
        pricePaise: p.pricePaise,
        billingPeriod: BillingPeriod.MONTHLY,
        trialDays: p.trialDays,
        sortOrder: i,
        features: {
          create: [
            { key: "MAX_LISTINGS", label: "Active services", valueInt: (i + 1) * 10 },
            { key: "MAX_PHOTOS", label: "Gallery photos", valueInt: (i + 1) * 5 },
            { key: "LEADS_PER_MONTH", label: "Leads per month", valueInt: (i + 1) * 20 },
            { key: "PRIORITY_RANK", label: "Search priority", valueInt: i },
            { key: "VERIFIED_BADGE", label: "Verified badge", valueBool: i >= 1 },
            { key: "ANALYTICS", label: "Analytics dashboard", valueBool: i >= 2 },
          ],
        },
      },
    });
    plans.push(plan);
  }

  for (const [i, p] of banquetPlans.entries()) {
    const plan = await db.subscriptionPlan.create({
      data: {
        audience: PlanAudience.BANQUET,
        code: p.code,
        name: p.name,
        description: `${p.name} plan for banquet owners.`,
        pricePaise: p.pricePaise,
        billingPeriod: BillingPeriod.MONTHLY,
        trialDays: p.trialDays,
        sortOrder: i,
        features: {
          create: [
            { key: "MAX_LISTINGS", label: "Active halls/packages", valueInt: (i + 1) * 3 },
            { key: "MAX_PHOTOS", label: "Gallery photos", valueInt: (i + 1) * 8 },
            { key: "LEADS_PER_MONTH", label: "Leads per month", valueInt: (i + 1) * 15 },
            { key: "PRIORITY_RANK", label: "Search priority", valueInt: i },
            { key: "VERIFIED_BADGE", label: "Verified badge", valueBool: i >= 1 },
          ],
        },
      },
    });
    plans.push(plan);
  }

  for (const [i, p] of customerPlans.entries()) {
    const plan = await db.subscriptionPlan.create({
      data: {
        audience: PlanAudience.CUSTOMER,
        code: p.code,
        name: p.name,
        description: "Unlock full nearby search results, direct booking, and extra discounts.",
        pricePaise: p.pricePaise,
        billingPeriod: p.period,
        trialDays: 0,
        sortOrder: i,
        features: {
          create: [
            { key: "UNLOCKS_PER_MONTH", label: "Profile unlocks per month", valueInt: 999 },
            { key: "FREE_CANCELLATIONS", label: "Free cancellations", valueBool: true },
            { key: "EXTRA_DISCOUNT_PERCENT", label: "Extra discount", valueInt: 5 + i * 2 },
          ],
        },
      },
    });
    plans.push(plan);
  }

  return plans;
}

/** Dev-only default password for the seeded admin/support accounts — never used for real users. */
const SEED_STAFF_PASSWORD = "AdminPass123";

async function seedAdmins() {
  const passwordHash = await bcrypt.hash(SEED_STAFF_PASSWORD, 12);

  const admin = await db.user.create({
    data: {
      name: "MakeGlowOver Admin",
      email: "admin@makeglowover.com",
      phone: nextIndianPhone(),
      passwordHash,
      role: Role.ADMIN,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  await db.user.create({
    data: {
      name: "Support Agent",
      email: "support@makeglowover.com",
      phone: nextIndianPhone(),
      passwordHash,
      role: Role.SUPPORT,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  return admin;
}

async function seedVendors(
  cities: { id: string; stateId: string; name: string; lat: number; lng: number }[],
  categories: { id: string; name: string; type: CategoryType }[],
  serviceCatalogs: { id: string; name: string; categoryId: string }[],
  plans: { id: string; code: string; pricePaise: number }[],
) {
  const beautyCategories = categories.filter((c) => c.type === CategoryType.BEAUTY);
  const vendorPlans = plans.filter((p) => p.code.startsWith("VENDOR_"));
  const vendors = [];

  const VENDOR_COUNT = 60;
  for (let i = 0; i < VENDOR_COUNT; i += 1) {
    const city = cities[i % cities.length];
    const category = pick(beautyCategories);
    const catalogEntries = serviceCatalogs.filter((s) => s.categoryId === category.id);
    const businessName = `${faker.company.name()} ${pick(["Studio", "Salon", "Beauty Lounge", "Makeovers"])}`;
    const slug = slugify(`${businessName}-${city.name}-${i}`);
    const { lat, lng } = jitterLatLng(city.lat, city.lng, 12);
    const servesAtHome = faker.datatype.boolean();

    const user = await db.user.create({
      data: {
        name: faker.person.fullName(),
        email: `${slug}@example.com`,
        phone: nextIndianPhone(),
        role: Role.VENDOR,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    const baseAddress = await db.address.create({
      data: {
        line1: faker.location.streetAddress(),
        line2: faker.location.secondaryAddress(),
        cityId: city.id,
        stateId: city.stateId,
        pincode: faker.location.zipCode("######"),
        lat,
        lng,
        type: AddressType.STUDIO,
      },
    });

    const vendor = await db.vendorProfile.create({
      data: {
        userId: user.id,
        businessName,
        slug,
        about: faker.lorem.paragraphs(2),
        coverImage: placeholderPhoto(slug, 0),
        yearsExperience: faker.number.int({ min: 1, max: 20 }),
        teamSize: faker.number.int({ min: 1, max: 12 }),
        kycStatus: KycStatus.APPROVED,
        isPublished: true,
        ratingAvg: faker.number.float({ min: 3.5, max: 5, fractionDigits: 2 }),
        ratingCount: faker.number.int({ min: 5, max: 250 }),
        viewCount: faker.number.int({ min: 50, max: 5000 }),
        cityId: city.id,
        primaryCategoryId: category.id,
        baseAddressId: baseAddress.id,
        servesInStudio: true,
        servesAtHome,
        homeServiceRadiusKm: servesAtHome ? faker.number.int({ min: 5, max: 25 }) : 0,
        homeServiceMinOrderPaise: servesAtHome ? 99_900 : 0,
        travelFeePaise: servesAtHome ? faker.number.int({ min: 0, max: 30 }) * 100 : 0,
        lat,
        lng,
        boostScore: faker.number.int({ min: 0, max: 100 }),
        publishedAt: faker.date.past({ years: 1 }),
        services: {
          create: pickMany(
            catalogEntries,
            faker.number.int({ min: 1, max: Math.min(2, catalogEntries.length) }),
          ).map((entry) => ({
            serviceCatalogId: entry.id,
            title: entry.name,
            description: faker.lorem.sentence(),
            pricePaise: faker.number.int({ min: 15, max: 250 }) * 100,
            durationMin: 60,
            mode: servesAtHome ? VendorServiceMode.BOTH : VendorServiceMode.IN_STUDIO,
          })),
        },
      },
    });
    vendors.push({ ...vendor, cityId: city.id });

    await db.mediaAsset.createMany({
      data: Array.from({ length: 3 }).map((_, idx) => ({
        ownerType: "VENDOR" as const,
        ownerId: vendor.id,
        url: placeholderPhoto(slug, idx + 1),
        sortOrder: idx,
        isCover: idx === 0,
      })),
    });

    await db.availability.createMany({
      data: Array.from({ length: 6 }).map((_, weekday) => ({
        ownerType: "VENDOR" as const,
        ownerId: vendor.id,
        weekday: weekday + 1, // Monday(1) .. Saturday(6)
        startTime: timeOfDay(10),
        endTime: timeOfDay(19),
      })),
    });

    if (i % 3 === 0) {
      const plan = pick(vendorPlans);
      await db.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: faker.date.soon({ days: 30 }),
          priceSnapshotPaise: plan.pricePaise,
          featureSnapshot: {},
        },
      });
      await db.vendorProfile.update({
        where: { id: vendor.id },
        data: { subscriptionTier: plan.code },
      });
    }

    if (i % 6 === 0) {
      await db.package.create({
        data: {
          vendorId: vendor.id,
          name: `${businessName} Bridal Package`,
          description: faker.lorem.sentence(),
          inclusions: ["Bridal Makeup", "Hair Styling", "Saree Draping"],
          pricePaise: faker.number.int({ min: 800, max: 3000 }) * 100,
        },
      });
    }
  }

  return vendors;
}

async function seedBanquets(
  cities: { id: string; stateId: string; name: string; lat: number; lng: number }[],
  categories: { id: string; name: string; type: CategoryType }[],
  plans: { id: string; code: string; pricePaise: number }[],
) {
  const banquetCategories = categories.filter((c) => c.type === CategoryType.BANQUET);
  const banquetPlans = plans.filter((p) => p.code.startsWith("BANQUET_"));
  const banquets = [];

  const BANQUET_COUNT = 25;
  for (let i = 0; i < BANQUET_COUNT; i += 1) {
    const city = cities[i % cities.length];
    const category = pick(banquetCategories);
    const venueName = `${faker.company.name()} ${pick(["Banquets", "Palace", "Gardens", "Convention Center"])}`;
    const slug = slugify(`${venueName}-${city.name}-${i}`);
    const { lat, lng } = jitterLatLng(city.lat, city.lng, 15);

    const user = await db.user.create({
      data: {
        name: faker.person.fullName(),
        email: `${slug}@example.com`,
        phone: nextIndianPhone(),
        role: Role.BANQUET_OWNER,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    const address = await db.address.create({
      data: {
        line1: faker.location.streetAddress(),
        line2: faker.location.secondaryAddress(),
        cityId: city.id,
        stateId: city.stateId,
        pincode: faker.location.zipCode("######"),
        lat,
        lng,
        type: AddressType.OTHER,
      },
    });

    const banquet = await db.banquetProfile.create({
      data: {
        userId: user.id,
        venueName,
        slug,
        about: faker.lorem.paragraphs(2),
        venueType: pick(["Indoor", "Outdoor", "Indoor & Outdoor"]),
        totalHalls: 2,
        parkingCapacity: faker.number.int({ min: 20, max: 200 }),
        hasRooms: faker.datatype.boolean(),
        roomCount: faker.number.int({ min: 0, max: 30 }),
        vegPricePerPlatePaise: faker.number.int({ min: 400, max: 1200 }) * 100,
        nonVegPricePerPlatePaise: faker.number.int({ min: 600, max: 1600 }) * 100,
        rentPaise: faker.number.int({ min: 50_000, max: 500_000 }) * 100,
        alcoholAllowed: faker.datatype.boolean(),
        decorAllowed: true,
        outsideCatererAllowed: faker.datatype.boolean(),
        kycStatus: KycStatus.APPROVED,
        isPublished: true,
        ratingAvg: faker.number.float({ min: 3.5, max: 5, fractionDigits: 2 }),
        ratingCount: faker.number.int({ min: 5, max: 150 }),
        cityId: city.id,
        primaryCategoryId: category.id,
        addressId: address.id,
        lat,
        lng,
        boostScore: faker.number.int({ min: 0, max: 100 }),
        publishedAt: faker.date.past({ years: 1 }),
        halls: {
          create: Array.from({ length: 2 }).map((_, idx) => ({
            name: idx === 0 ? "Grand Hall" : "Lawn",
            seatingCapacity: faker.number.int({ min: 100, max: 800 }),
            floatingCapacity: faker.number.int({ min: 150, max: 1200 }),
            area: faker.number.int({ min: 2000, max: 15000 }),
            isAC: idx === 0,
            rentPaise: faker.number.int({ min: 50_000, max: 300_000 }) * 100,
          })),
        },
      },
    });
    banquets.push({ ...banquet, cityId: city.id });

    await db.mediaAsset.createMany({
      data: Array.from({ length: 3 }).map((_, idx) => ({
        ownerType: "BANQUET" as const,
        ownerId: banquet.id,
        url: placeholderPhoto(slug, idx + 1),
        sortOrder: idx,
        isCover: idx === 0,
      })),
    });

    await db.availability.createMany({
      data: Array.from({ length: 7 }).map((_, weekday) => ({
        ownerType: "BANQUET" as const,
        ownerId: banquet.id,
        weekday,
        startTime: timeOfDay(9),
        endTime: timeOfDay(23),
      })),
    });

    if (i % 2 === 0) {
      const plan = pick(banquetPlans);
      await db.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: faker.date.soon({ days: 30 }),
          priceSnapshotPaise: plan.pricePaise,
          featureSnapshot: {},
        },
      });
    }
  }

  return banquets;
}

async function seedCustomers(plans: { id: string; code: string; pricePaise: number }[]) {
  const customerPlans = plans.filter((p) => p.code.startsWith("PLUS_"));
  const customers = [];
  for (let i = 0; i < 20; i += 1) {
    const name = faker.person.fullName();
    const customer = await db.user.create({
      data: {
        name,
        email: `${slugify(name)}.${i}@example.com`,
        phone: nextIndianPhone(),
        role: Role.CUSTOMER,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });
    customers.push(customer);

    if (i % 4 === 0) {
      const plan = pick(customerPlans);
      await db.subscription.create({
        data: {
          userId: customer.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: faker.date.soon({ days: 30 }),
          priceSnapshotPaise: plan.pricePaise,
          featureSnapshot: {},
        },
      });
    }
  }
  return customers;
}

async function seedCoupons() {
  const now = new Date();
  const endsAt = faker.date.future({ years: 1 });

  const platformPercent = await db.coupon.create({
    data: {
      code: "WELCOME10",
      ownerType: CouponOwnerType.PLATFORM,
      discountType: CouponDiscountType.PERCENT,
      value: 10,
      maxDiscountPaise: 50_000,
      appliesTo: CouponAppliesTo.BOOKING,
      startsAt: now,
      endsAt,
      isActive: true,
    },
  });
  const platformFlat = await db.coupon.create({
    data: {
      code: "PLUS100",
      ownerType: CouponOwnerType.PLATFORM,
      discountType: CouponDiscountType.FLAT,
      value: 10_000,
      appliesTo: CouponAppliesTo.SUBSCRIPTION,
      startsAt: now,
      endsAt,
      isActive: true,
    },
  });

  return [platformPercent, platformFlat];
}

async function seedSettingsAndFlags() {
  await db.setting.createMany({
    data: [
      { key: "commission_percent_beauty", value: 15 },
      { key: "commission_percent_banquet", value: 10 },
      { key: "free_unlock_quota_signed_in", value: 5 },
      { key: "free_unlock_quota_guest", value: 3 },
      { key: "default_home_service_radius_km", value: 15 },
      {
        key: "cancellation_policy",
        value: { fullRefundBeforeHours: 24, partialRefundPercent: 50, partialRefundBeforeHours: 4 },
      },
      {
        key: "ranking_weights",
        value: {
          distance: 0.35,
          rating: 0.25,
          profileCompleteness: 0.1,
          responseRate: 0.1,
          boostScore: 0.15,
          recency: 0.05,
        },
      },
    ],
  });

  await db.featureFlag.createMany({
    data: [
      { key: "customer_unlock_paywall", isEnabled: true, rolloutPercent: 100 },
      { key: "whatsapp_notifications", isEnabled: false, rolloutPercent: 0 },
      { key: "razorpay_subscriptions", isEnabled: false, rolloutPercent: 0 },
    ],
  });
}

async function seedBookingsAndReviews(
  customers: { id: string }[],
  vendors: { id: string; cityId: string }[],
  banquets: { id: string; cityId: string }[],
) {
  const statuses = [
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.CONFIRMED,
    BookingStatus.PENDING,
    BookingStatus.CANCELLED,
  ];

  for (let i = 0; i < 30; i += 1) {
    const customer = pick(customers);
    const isVendorBooking = i % 3 !== 0;
    const owner = isVendorBooking ? pick(vendors) : pick(banquets);
    const status = pick(statuses);
    const subtotalPaise = faker.number.int({ min: 1000, max: 20000 }) * 100;
    const taxPaise = Math.round(subtotalPaise * 0.18);
    const totalPaise = subtotalPaise + taxPaise;

    const booking = await db.booking.create({
      data: {
        bookingNo: `MGO${String(100000 + i)}`,
        customerId: customer.id,
        ownerType: isVendorBooking ? ProfileOwnerType.VENDOR : ProfileOwnerType.BANQUET,
        ownerId: owner.id,
        type: isVendorBooking ? BookingType.IN_STUDIO : BookingType.VENUE,
        scheduledAt: faker.date.soon({ days: 60 }),
        durationMin: 60,
        status,
        subtotalPaise,
        taxPaise,
        totalPaise,
        commissionPaise: Math.round(subtotalPaise * 0.12),
        items: {
          create: [
            {
              titleSnapshot: isVendorBooking ? "Bridal Makeup - HD" : "Grand Hall Booking",
              unitPricePaise: subtotalPaise,
              qty: 1,
              lineTotalPaise: subtotalPaise,
            },
          ],
        },
      },
    });

    await db.payment.create({
      data: {
        bookingId: booking.id,
        provider: PaymentProvider.RAZORPAY,
        providerOrderId: faker.string.alphanumeric(14),
        providerPaymentId: status === BookingStatus.PENDING ? null : faker.string.alphanumeric(14),
        amountPaise: totalPaise,
        status: status === BookingStatus.PENDING ? PaymentStatus.CREATED : PaymentStatus.CAPTURED,
        idempotencyKey: faker.string.uuid(),
      },
    });

    if (status === BookingStatus.COMPLETED) {
      await db.review.create({
        data: {
          bookingId: booking.id,
          authorId: customer.id,
          ownerType: isVendorBooking ? ProfileOwnerType.VENDOR : ProfileOwnerType.BANQUET,
          ownerId: owner.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          title: faker.lorem.words(4),
          body: faker.lorem.sentences(2),
          status: ReviewStatus.APPROVED,
        },
      });
    }
  }
}

async function seedLeadsAndUnlocks(customers: { id: string }[], vendors: { id: string }[]) {
  await db.lead.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      customerId: pick(customers).id,
      ownerType: ProfileOwnerType.VENDOR,
      ownerId: pick(vendors).id,
      source: pick(["profile_view", "search_result", "whatsapp"]),
      phoneRevealed: faker.datatype.boolean(),
    })),
  });

  await db.unlockEvent.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      userId: pick(customers).id,
      targetType: ProfileOwnerType.VENDOR,
      targetId: pick(vendors).id,
      source: pick([UnlockSource.SUBSCRIPTION, UnlockSource.COUPON, UnlockSource.FREE_QUOTA]),
    })),
  });
}

async function seedNotificationsAndAuditLog(customers: { id: string }[], admin: { id: string }) {
  await db.notification.createMany({
    data: Array.from({ length: 5 }).map(() => ({
      userId: pick(customers).id,
      channel: pick([
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.IN_APP,
      ]),
      template: "booking_confirmed",
      payload: { bookingNo: `MGO10000${faker.number.int({ min: 0, max: 9 })}` },
      status: NotificationStatus.SENT,
      sentAt: faker.date.recent({ days: 10 }),
    })),
  });

  await db.auditLog.createMany({
    data: Array.from({ length: 5 }).map(() => ({
      actorId: admin.id,
      action: pick(["vendor.approve", "vendor.publish", "coupon.create", "plan.update"]),
      entityType: "VendorProfile",
      entityId: faker.string.uuid(),
      before: {},
      after: {},
      ip: faker.internet.ip(),
      userAgent: "Mozilla/5.0 (seed script)",
    })),
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding taxonomy (states, cities, localities, categories, service catalog)...");
  const { cities, categories, serviceCatalogs } = await seedTaxonomy();

  console.log("Seeding subscription plans...");
  const plans = await seedPlans();

  console.log("Seeding admin + support users...");
  const admin = await seedAdmins();

  console.log("Seeding vendors...");
  const vendors = await seedVendors(cities, categories, serviceCatalogs, plans);

  console.log("Seeding banquets...");
  const banquets = await seedBanquets(cities, categories, plans);

  console.log("Seeding customers...");
  const customers = await seedCustomers(plans);

  console.log("Seeding coupons...");
  await seedCoupons();

  console.log("Seeding settings and feature flags...");
  await seedSettingsAndFlags();

  console.log("Seeding bookings, payments, and reviews...");
  await seedBookingsAndReviews(customers, vendors, banquets);

  console.log("Seeding leads and unlock events...");
  await seedLeadsAndUnlocks(customers, vendors);

  console.log("Seeding notifications and audit log...");
  await seedNotificationsAndAuditLog(customers, admin);

  console.log("Seed complete:", {
    cities: cities.length,
    categories: categories.length,
    serviceCatalogs: serviceCatalogs.length,
    vendors: vendors.length,
    banquets: banquets.length,
    customers: customers.length,
    plans: plans.length,
  });
  console.log(
    `Admin login: admin@makeglowover.com / ${SEED_STAFF_PASSWORD} (support@makeglowover.com uses the same password)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
