import type { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  BANQUET_ACCOUNT_COUNT_BASELINE,
  BANQUET_ACCOUNT_COUNT_KEY,
  VENDOR_ACCOUNT_COUNT_BASELINE,
  VENDOR_ACCOUNT_COUNT_KEY,
} from "@/lib/marketplace-stats";
import { getMarketplaceStats } from "@/server/repositories/catalog";
import { createUserWithPassword } from "@/server/repositories/user";

describe("homepage vendor and banquet account counters", () => {
  const suffix = Date.now();
  const vendorEmail = `marketplace-count-vendor-${suffix}@example.com`;
  const banquetEmail = `marketplace-count-banquet-${suffix}@example.com`;
  type SettingSnapshot = { value: Prisma.JsonValue } | null;
  let originalVendorSetting: SettingSnapshot = null;
  let originalBanquetSetting: SettingSnapshot = null;

  async function restoreSetting(key: string, setting: SettingSnapshot) {
    if (!setting) {
      await db.setting.deleteMany({ where: { key } });
      return;
    }

    const value = JSON.stringify(setting.value);
    if (value === undefined) {
      throw new Error(`Could not serialize the saved setting value for ${key}.`);
    }

    await db.$executeRaw`
      INSERT INTO \`Setting\` (\`key\`, \`value\`, \`updatedAt\`)
      VALUES (${key}, CAST(${value} AS JSON), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        \`value\` = VALUES(\`value\`),
        \`updatedAt\` = CURRENT_TIMESTAMP(3)
    `;
  }

  beforeAll(async () => {
    const [vendorSetting, banquetSetting] = await Promise.all([
      db.setting.findUnique({
        where: { key: VENDOR_ACCOUNT_COUNT_KEY },
        select: { value: true },
      }),
      db.setting.findUnique({
        where: { key: BANQUET_ACCOUNT_COUNT_KEY },
        select: { value: true },
      }),
    ]);
    originalVendorSetting = vendorSetting;
    originalBanquetSetting = banquetSetting;
    await db.setting.deleteMany({
      where: { key: { in: [VENDOR_ACCOUNT_COUNT_KEY, BANQUET_ACCOUNT_COUNT_KEY] } },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { in: [vendorEmail, banquetEmail] } } });
    await restoreSetting(VENDOR_ACCOUNT_COUNT_KEY, originalVendorSetting);
    await restoreSetting(BANQUET_ACCOUNT_COUNT_KEY, originalBanquetSetting);
  });

  it("starts at the configured baselines and increments atomically for new role accounts", async () => {
    expect(await getMarketplaceStats()).toMatchObject({
      vendors: VENDOR_ACCOUNT_COUNT_BASELINE,
      banquets: BANQUET_ACCOUNT_COUNT_BASELINE,
    });

    await createUserWithPassword({
      name: "Marketplace counter vendor",
      email: vendorEmail,
      passwordHash: "test-hash",
      role: "VENDOR",
    });
    await createUserWithPassword({
      name: "Marketplace counter banquet",
      email: banquetEmail,
      passwordHash: "test-hash",
      role: "BANQUET_OWNER",
    });

    expect(await getMarketplaceStats()).toMatchObject({
      vendors: VENDOR_ACCOUNT_COUNT_BASELINE + 1,
      banquets: BANQUET_ACCOUNT_COUNT_BASELINE + 1,
    });
  });
});
