import { 
  serviceCategories, type ServiceCategory, type InsertServiceCategory,
  stores, type Store, type InsertStore,
  products, type Product
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Service Category operations
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  return await db.select().from(serviceCategories).orderBy(serviceCategories.id);
}

export async function getServiceCategoryBySlug(slug: string): Promise<ServiceCategory | undefined> {
  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, slug));
  return result[0];
}

export async function createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
  const result = await db.insert(serviceCategories).values(category).returning();
  return result[0];
}

export async function updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
  const result = await db.update(serviceCategories)
    .set(category)
    .where(eq(serviceCategories.id, id))
    .returning();
  return result[0];
}

export async function deleteServiceCategory(id: number): Promise<boolean> {
  const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
  return result.rowCount ? result.rowCount > 0 : true;
}

// Store operations
export async function getStores(): Promise<Store[]> {
  return await db.select().from(stores);
}

export async function getStoresByCategory(categoryId: number): Promise<Store[]> {
  return await db.select().from(stores).where(eq(stores.categoryId, categoryId));
}

export async function getStoresByCategorySlug(slug: string): Promise<Store[]> {
  const category = await getServiceCategoryBySlug(slug);
  if (!category) return [];
  
  return await db.select().from(stores).where(eq(stores.categoryId, category.id));
}

export async function getStore(id: number): Promise<Store | undefined> {
  const result = await db.select().from(stores).where(eq(stores.id, id));
  return result[0];
}

export async function getStoreWithProducts(id: number): Promise<(Store & { products: Product[] }) | undefined> {
  const store = await getStore(id);
  if (!store) return undefined;
  
  const storeProducts = await db.select().from(products).where(eq(products.storeId, id));
  
  return {
    ...store,
    products: storeProducts
  };
}

export async function createStore(store: InsertStore): Promise<Store> {
  const result = await db.insert(stores).values(store).returning();
  return result[0];
}

export async function updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
  const result = await db.update(stores)
    .set(store)
    .where(eq(stores.id, id))
    .returning();
  return result[0];
}

export async function deleteStore(id: number): Promise<boolean> {
  const result = await db.delete(stores).where(eq(stores.id, id));
  return result.rowCount ? result.rowCount > 0 : true;
}