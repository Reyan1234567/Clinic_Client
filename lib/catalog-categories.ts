export const CATALOG_CATEGORIES = [
  "CONSULT",
  "PREVENTIVE",
  "RESTORATIVE",
  "ENDODONTICS",
  "SURGERY",
  "PROSTHODONTICS",
  "COSMETIC",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];
