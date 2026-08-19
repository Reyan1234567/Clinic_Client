import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
} from "@/lib/api/client";
import type { CatalogCategory, CatalogItem } from "@/lib/types";

export interface CatalogListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

/** Prices are sent as numbers and come back as decimal strings. */
export interface CatalogItemInput {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
}

export interface CatalogCategoryInput {
  name: string;
  description?: string | null;
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

/** GET /catalog/categories — requires `catalog.read`. */
export function listCategories() {
  return requestData<CatalogCategory[]>("/catalog/categories");
}

/** POST /catalog/categories — requires `catalog.update`. */
export function createCategory(input: CatalogCategoryInput) {
  return requestData<CatalogCategory>("/catalog/categories", {
    method: "POST",
    ...json(input),
  });
}

/** PATCH /catalog/categories/:id — requires `catalog.update`. */
export function updateCategory(id: string, input: Partial<CatalogCategoryInput>) {
  return requestData<CatalogCategory>(`/catalog/categories/${id}`, {
    method: "PATCH",
    ...json(input),
  });
}

/** DELETE /catalog/categories/:id — requires `catalog.delete`. */
export function deleteCategory(id: string) {
  return requestMessage(`/catalog/categories/${id}`, { method: "DELETE" });
}
