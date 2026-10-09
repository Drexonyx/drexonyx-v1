// Brand Architecture v2.0 — single source of truth.
// DREXONYX = Master / Group Brand
// MDA — MASTER DIGITAL AGENCY = Flagship Commercial / Service Brand

export const BRAND = {
  MASTER_BRAND: "DREXONYX",

  MDA_NAME: "MDA",
  MDA_DESCRIPTOR: "MASTER DIGITAL AGENCY",

  ENDORSEMENT: "A DREXONYX Brand",
  POWERED_BY: "Powered by DREXONYX",

  SERVICE_CATEGORIES: ["Digital", "Creative", "Media", "Business Solutions"] as const,
} as const;

export type ServiceCategory = (typeof BRAND.SERVICE_CATEGORIES)[number];
