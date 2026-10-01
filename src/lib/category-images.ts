/**
 * Curated, verified-relevant stock photos (Unsplash, free for commercial use)
 * keyed by category slug. Used so every vendor/banquet profile — seeded mock
 * data and real onboarding alike — shows photos that actually match the
 * service, instead of an unrelated random placeholder.
 */
const CATEGORY_PHOTO_IDS: Record<string, string[]> = {
  "bridal-makeup": [
    "photo-1684868268327-7e5590bcfbd6",
    "photo-1610173827043-9db50e0d8ef9",
    "photo-1730486559425-45221a85d6dd",
  ],
  "party-makeup": [
    "photo-1596205521983-9c372fb3d4f1",
    "photo-1594647210801-5124307f3d51",
    "photo-1634052970539-224813476367",
  ],
  "hair-styling": [
    "photo-1634449571010-02389ed0f9b0",
    "photo-1580618672591-eb180b1a973f",
    "photo-1629397685944-7073f5589754",
  ],
  "hair-coloring": [
    "photo-1707979577466-2d6109c68a45",
    "photo-1707720531504-ce087725861a",
    "photo-1707812343087-c9ff9e5abb43",
  ],
  "facial-skincare": [
    "photo-1570172619644-dfd03ed5d881",
    "photo-1643684391140-c5056cfd3436",
    "photo-1761718209835-c8586b7dcac0",
  ],
  "mehendi-artist": [
    "photo-1732118400647-a81e3b37be87",
    "photo-1623217509141-6f735087b50c",
    "photo-1716672042560-c59ebb0805e6",
  ],
  "nail-art": [
    "photo-1519014816548-bf5fe059798b",
    "photo-1571290274554-6a2eaa771e5f",
    "photo-1604654894611-6973b376cbde",
  ],
  "waxing-threading": [
    "photo-1519415387722-a1c3bbef716c",
    "photo-1783013951101-2d9ed3eac234",
    "photo-1735151225868-3f40c5b51396",
  ],
  "salon-for-men": [
    "photo-1605497788044-5a32c7078486",
    "photo-1647140655214-e4a2d914971f",
    "photo-1635273051937-a0ddef9573b6",
  ],
  "spa-massage": [
    "photo-1741522509438-a120c0bb5e88",
    "photo-1600334089648-b0d9d3028eb2",
    "photo-1639162906614-0603b0ae95fd",
  ],
  "saree-draping": [
    "photo-1572470176170-98fa8abcb741",
    "photo-1597897569252-9df44c7de0db",
    "photo-1614940685083-c5409b57da6e",
  ],
  "banquet-halls": [
    "photo-1768851142332-75f3d1b47452",
    "photo-1783314867628-220ab03cac99",
    "photo-1717680281618-442cb9c12b6c",
  ],
  "marriage-gardens": [
    "photo-1762216444919-043cf813e4de",
    "photo-1770824906466-6254ca2cdc14",
    "photo-1779633203712-bf43c894f275",
  ],
  // No dedicated farmhouse-venue stock set survived review (searches kept
  // surfacing literal Western farm barns) — these are the same verified
  // outdoor-lawn/garden venue photos as Marriage Gardens, which is an
  // honest visual match for an Indian wedding farmhouse venue.
  farmhouses: [
    "photo-1774814305525-c302b0dee3e7",
    "photo-1762216444919-043cf813e4de",
    "photo-1770824906466-6254ca2cdc14",
  ],
  "wedding-resorts": [
    "photo-1768488292764-8da1562789b0",
    "photo-1768488292726-9c850289925a",
    "photo-1785300320574-9c6e0f0e957a",
  ],
};

// Used only if a category slug has no entry above (shouldn't happen for the
// fixed BEAUTY_CATEGORIES/BANQUET_CATEGORIES taxonomy, but keeps this
// function total rather than throwing on an unrecognised slug).
const FALLBACK_PHOTO_IDS = CATEGORY_PHOTO_IDS["bridal-makeup"];

export function categoryPhotoUrl(categorySlug: string, index: number): string {
  const ids = CATEGORY_PHOTO_IDS[categorySlug] ?? FALLBACK_PHOTO_IDS;
  const id = ids[index % ids.length];
  return `https://images.unsplash.com/${id}?w=800&h=600&fit=crop&q=80`;
}
