import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
} from "@/lib/api/client";
import type { CatalogCategory } from "@/lib/catalog-categories";
import type { CatalogItem } from "@/lib/types";

export interface CatalogListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: CatalogCategory;
}

/** Prices are sent as numbers and come back as decimal strings. */
export interface CatalogItemInput {
  name: string;
  description?: string;
  category: CatalogCategory;
  price: number;
}

/** GET /catalog — requires `catalog.read`. */
export function listCatalog(params: CatalogListParams = {}) {
  return requestPage<CatalogItem>(`/catalog${buildQuery({ ...params })}`);
}

/** GET /catalog/:id — requires `catalog.read`. */
export function getCatalogItem(id: string) {
  return requestData<CatalogItem>(`/catalog/${id}`);
}

/** POST /catalog — requires `catalog.create`. The body is an array (bulk create). */
export function createCatalogItems(items: CatalogItemInput[]) {
  return requestData<CatalogItem[]>("/catalog", { method: "POST", ...json(items) });
}

/** PATCH /catalog/:id — requires `catalog.update`. */
export function updateCatalogItem(id: string, input: Partial<CatalogItemInput>) {
  return requestData<CatalogItem>(`/catalog/${id}`, { method: "PATCH", ...json(input) });
}

/** DELETE /catalog/:id — requires `catalog.delete`. Soft delete. */
export function deleteCatalogItem(id: string) {
  return requestMessage(`/catalog/${id}`, { method: "DELETE" });
}
