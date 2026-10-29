import { validateImageFile } from './media';
import type { OrderEmailReceipt } from '../shared/order-email';
import {
    products, type Product, type InsertProduct,
    orders, orderEmails, type Order, type InsertOrder,
    orderItems, type OrderItem, type InsertOrderItem,
    users, type User, type UserWithNullablePhone, type InsertUser,
    siteContent, type SiteContent, type InsertSiteContent,
    bankAccounts, type BankAccount, type InsertBankAccount,
    navigationItems, type NavigationItem, type InsertNavigationItem,
    categories, type Category, type InsertCategory,
    mediaLibrary, type MediaItem, type InsertMediaItem,
    siteSettings, type SiteSetting, type InsertSiteSetting,
    footerSettings, type FooterSetting, type InsertFooterSetting,
    mealKits, type MealKit, type InsertMealKit,
    mealKitComponents, type MealKitComponent, type InsertMealKitComponent,
    generatedMealKits, type GeneratedMealKit, type InsertGeneratedMealKit,
    generatedMealKitComponents, type GeneratedMealKitComponent, type InsertGeneratedMealKitComponent,
    serviceCategories, type ServiceCategory, type InsertServiceCategory,
    stores, type Store, type InsertStore,
    nonDeliveryDays, type NonDeliveryDay, type InsertNonDeliveryDay,
    deliverySettings, type DeliverySetting, type InsertDeliverySetting,
    reviews, type Review, type InsertReview
} from "@shared/schema";
import { DrizzleDB } from "./db";
import { eq, desc, and, or, asc, not, gte, lte, lt, inArray, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

// Promisify scrypt for async usage
const scryptAsync = promisify(scrypt);

export interface IStorage {
    // Product operations
    getProducts(): Promise<Product[]>;
    getProductsByCategory(category: string): Promise<Product[]>;
    getProduct(id: number): Promise<Product | undefined>;
    createProduct(product: InsertProduct): Promise<Product>;
    updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
    deleteProduct(id: number): Promise<boolean>;

    // Order operations
    getOrders(startDate?: Date, endDate?: Date): Promise<Order[]>;
    getOrdersWithItems(startDate?: Date, endDate?: Date, options?: OrderListOptions): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]>;
    getOrder(id: number): Promise<Order | undefined>;
    getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined>;
    createOrder(order: InsertOrder, items: InsertOrderItem[], receipt?: OrderEmailReceipt): Promise<Order>;
    updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
    deleteOrder(id: number): Promise<boolean>;

    // User operations
    getAllUsers(): Promise<User[]>;
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    getUserByEmail(email: string): Promise<User | undefined>;
    getAdminByLogin(login: string): Promise<User | undefined>;
    getUserByGoogleId(googleId: string): Promise<User | undefined>;
    updateUserGoogleId(userId: number, googleId: string, profileImageUrl?: string): Promise<User | undefined>;
    getUserOrders(userId: number): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]>;
    getPendingOrdersCount(): Promise<number>;
    getLatestOrderId(): Promise<number>;
    getStats(): Promise<{ totalOrders: number, totalSales: number, totalProducts: number, totalUsers: number }>;

    // Site Content operations (CMS)
    getSiteContents(): Promise<SiteContent[]>;
    getSiteContentByKey(key: string): Promise<SiteContent | undefined>;
    createSiteContent(content: InsertSiteContent): Promise<SiteContent>;
    updateSiteContent(id: number, content: Partial<InsertSiteContent>): Promise<SiteContent | undefined>;
    deleteSiteContent(id: number): Promise<boolean>;

    // Bank Account operations
    getBankAccounts(): Promise<BankAccount[]>;
    getDefaultBankAccount(): Promise<BankAccount | undefined>;
    getBankAccount(id: number): Promise<BankAccount | undefined>;
    createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount>;
    updateBankAccount(id: number, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
    deleteBankAccount(id: number): Promise<boolean>;
    setDefaultBankAccount(id: number): Promise<boolean>;

    // Navigation Menu operations (CMS)
    getNavigationItems(): Promise<NavigationItem[]>;
    getNavigationItemsTree(): Promise<NavigationItem[]>; // Returns hierarchical structure
    getNavigationItem(id: number): Promise<NavigationItem | undefined>;
    createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem>;
    updateNavigationItem(id: number, item: Partial<InsertNavigationItem>): Promise<NavigationItem | undefined>;
    updateNavigationItemsOrder(itemIds: number[]): Promise<boolean>; // Re-order items
    deleteNavigationItem(id: number): Promise<boolean>;

    // Category operations (CMS)
    getCategories(): Promise<Category[]>;
    getCategory(id: number): Promise<Category | undefined>;
    getCategoryBySlug(slug: string): Promise<Category | undefined>;
    createCategory(category: InsertCategory): Promise<Category>;
    updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
    updateCategoriesOrder(categoryIds: number[]): Promise<boolean>; // Re-order categories
    deleteCategory(id: number): Promise<boolean>;

    // Media Library operations (CMS)
    getMediaItems(): Promise<MediaItem[]>;
    getMediaItem(id: number): Promise<MediaItem | undefined>;
    createMediaItem(media: InsertMediaItem): Promise<MediaItem>;
    updateMediaItem(id: number, media: Partial<InsertMediaItem>): Promise<MediaItem | undefined>;
    deleteMediaItem(id: number): Promise<boolean>;

    // Site Settings operations
    getSiteSettings(): Promise<SiteSetting[]>;
    getSiteSettingByKey(key: string): Promise<SiteSetting | undefined>;
    createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
    updateSiteSetting(id: number, setting: Partial<InsertSiteSetting>): Promise<SiteSetting | undefined>;
    updateSiteSettingByKey(key: string, value: string): Promise<SiteSetting | undefined>;

    // Footer Settings operations
    getFooterSettings(): Promise<FooterSetting | undefined>;
    updateFooterSettings(settings: Partial<InsertFooterSetting>): Promise<FooterSetting>;

    // Meal Kit operations
    getMealKits(): Promise<MealKit[]>;
    getMealKit(id: number): Promise<(MealKit & { components: (MealKitComponent & { product: Product })[] }) | undefined>;
    createMealKit(mealKit: InsertMealKit): Promise<MealKit>;
    updateMealKit(id: number, mealKit: Partial<InsertMealKit>): Promise<MealKit | undefined>;
    deleteMealKit(id: number): Promise<boolean>;

    // Meal Kit Component operations
    getMealKitComponents(mealKitId: number): Promise<(MealKitComponent & { product: Product })[]>;
    createMealKitComponent(component: InsertMealKitComponent): Promise<MealKitComponent>;
    updateMealKitComponent(id: number, component: Partial<InsertMealKitComponent>): Promise<MealKitComponent | undefined>;
    deleteMealKitComponent(id: number): Promise<boolean>;

    // Generated Meal Kit operations
    getGeneratedMealKits(userId?: number, sessionId?: string): Promise<GeneratedMealKit[]>;
    getGeneratedMealKit(id: number): Promise<(GeneratedMealKit & { components: (GeneratedMealKitComponent & { product: Product })[] }) | undefined>;
    createGeneratedMealKit(mealKit: InsertGeneratedMealKit, components: InsertGeneratedMealKitComponent[]): Promise<GeneratedMealKit>;
    updateGeneratedMealKit(id: number, mealKit: Partial<InsertGeneratedMealKit>): Promise<GeneratedMealKit | undefined>;
    deleteGeneratedMealKit(id: number): Promise<boolean>;

    // Generated Meal Kit Component operations
    getGeneratedMealKitComponents(mealKitId: number): Promise<(GeneratedMealKitComponent & { product: Product })[]>;

    // One-click meal kit generation
    generateMealKit(
        params: {
            userId?: number;
            sessionId?: string;
            name: string;
            productIds: number[];
            quantities?: Record<number, number>;
        }
    ): Promise<GeneratedMealKit & { components: (GeneratedMealKitComponent & { product: Product })[] }>;

    // Service Category operations
    getServiceCategories(): Promise<ServiceCategory[]>;
    getServiceCategoryBySlug(slug: string): Promise<ServiceCategory | undefined>;
    createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
    updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined>;
    deleteServiceCategory(id: number): Promise<boolean>;

    // Store operations
    getStores(): Promise<Store[]>;
    getStoresByCategory(categoryId: number): Promise<Store[]>;
    getStoresByCategorySlug(slug: string): Promise<Store[]>;
    getStore(id: number): Promise<Store | undefined>;
    getStoreWithProducts(id: number): Promise<(Store & { products: Product[] }) | undefined>;
    createStore(store: InsertStore): Promise<Store>;
    updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined>;
    deleteStore(id: number): Promise<boolean>;

    // Non-delivery day operations
    getNonDeliveryDays(): Promise<NonDeliveryDay[]>;
    getNonDeliveryDay(id: number): Promise<NonDeliveryDay | undefined>;
    createNonDeliveryDay(day: InsertNonDeliveryDay): Promise<NonDeliveryDay>;
    updateNonDeliveryDay(id: number, day: Partial<InsertNonDeliveryDay>): Promise<NonDeliveryDay | undefined>;
    deleteNonDeliveryDay(id: number): Promise<boolean>;

    // Delivery settings operations
    getDeliverySettings(): Promise<DeliverySetting | undefined>;
    updateDeliverySettings(settings: Partial<InsertDeliverySetting>): Promise<DeliverySetting>;

    // Review operations
    getReviews(): Promise<Review[]>;
    getApprovedReviews(): Promise<Review[]>;
    getReview(id: number): Promise<Review | undefined>;
    createReview(review: InsertReview): Promise<Review>;
    updateReview(id: number, review: Partial<InsertReview & { isApproved: boolean }>): Promise<Review | undefined>;
    deleteReview(id: number): Promise<boolean>;

    // Storage operations
    uploadFile(bucket: string, path: string, file: File): Promise<string>;
}

export type OrderListOptions = { limit?: number; beforeId?: number; search?: string; status?: string; userId?: number };

// SQLite lower() covers ASCII only. Fold Mongolian/Cyrillic explicitly, then
// use literal substring matching: D1 limits LIKE/GLOB patterns to 50 bytes.
function foldedOrderName() {
    let expression = sql`${orders.customerName}`;
    for (const upper of 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮ') {
        expression = sql`replace(${expression}, ${upper}, ${upper.toLowerCase()})`;
    }
    return sql`lower(${expression})`;
}

export class D1Storage implements IStorage {
    db: DrizzleDB;
    bucket?: R2Bucket;

    constructor(db: DrizzleDB, bucket?: R2Bucket) {
        this.db = db;
        this.bucket = bucket;
    }

    // Service Category operations
    async getServiceCategories(): Promise<ServiceCategory[]> {
        return await this.db.select().from(serviceCategories);
    }

    async getServiceCategoryBySlug(slug: string): Promise<ServiceCategory | undefined> {
        const result = await this.db.select().from(serviceCategories).where(eq(serviceCategories.slug, slug));
        return result[0];
    }

    async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
        const result = await this.db.insert(serviceCategories).values(category).returning();
        return result[0];
    }

    async updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
        const result = await this.db.update(serviceCategories)
            .set(category)
            .where(eq(serviceCategories.id, id))
            .returning();
        return result[0];
    }

    async deleteServiceCategory(id: number): Promise<boolean> {
        const result = await this.db.delete(serviceCategories).where(eq(serviceCategories.id, id));
        return result.meta.changes > 0;
    }

    // Store operations
    async getStores(): Promise<Store[]> {
        return await this.db.select().from(stores);
    }

    async getStoresByCategory(categoryId: number): Promise<Store[]> {
        return await this.db.select().from(stores).where(eq(stores.categoryId, categoryId));
    }

    async getStoresByCategorySlug(slug: string): Promise<Store[]> {
        const category = await this.getServiceCategoryBySlug(slug);
        if (!category) return [];

        return await this.db.select().from(stores).where(eq(stores.categoryId, category.id));
    }

    async getStore(id: number): Promise<Store | undefined> {
        const result = await this.db.select().from(stores).where(eq(stores.id, id));
        return result[0];
    }

    async getStoreWithProducts(id: number): Promise<(Store & { products: Product[] }) | undefined> {
        const store = await this.getStore(id);
        if (!store) return undefined;

        const storeProducts = await this.db.select().from(products).where(eq(products.storeId, id));

        return {
            ...store,
            products: storeProducts
        };
    }

    async createStore(store: InsertStore): Promise<Store> {
        const result = await this.db.insert(stores).values(store).returning();
        return result[0];
    }

    async updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
        const result = await this.db.update(stores)
            .set(store)
            .where(eq(stores.id, id))
            .returning();
        return result[0];
    }

    async deleteStore(id: number): Promise<boolean> {
        const result = await this.db.delete(stores).where(eq(stores.id, id));
        return result.meta.changes > 0;
    }

    // Product operations
    async getProducts(): Promise<Product[]> {
        return await this.db.select().from(products);
    }

    async getProductsByCategory(category: string): Promise<Product[]> {
        return await this.db.select().from(products).where(eq(products.category, category));
    }

    async getProduct(id: number): Promise<Product | undefined> {
        const result = await this.db.select().from(products).where(eq(products.id, id));
        return result[0];
    }

    async createProduct(product: InsertProduct): Promise<Product> {
        const result = await this.db.insert(products).values(product).returning();
        return result[0];
    }

    async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
        const result = await this.db.update(products)
            .set(product)
            .where(eq(products.id, id))
            .returning();

        return result[0];
    }

    async deleteProduct(id: number): Promise<boolean> {
        const result = await this.db.delete(products).where(eq(products.id, id));
        return result.meta.changes > 0;
    }

    // Order operations
    async getOrders(startDate?: Date, endDate?: Date): Promise<Order[]> {
        let conditions = [];

        // Build filter conditions if provided
        if (startDate) {
            conditions.push(gte(orders.createdAt, startDate));
        }

        if (endDate) {
            conditions.push(lte(orders.createdAt, endDate));
        }

        // Apply filters or get all orders
        if (conditions.length > 0) {
            return await this.db.select()
                .from(orders)
                .where(conditions.length > 1 ? and(...conditions) : conditions[0])
                .orderBy(desc(orders.createdAt));
        } else {
            // No filters, return all orders
            return await this.db.select()
                .from(orders)
                .orderBy(desc(orders.createdAt));
        }
    }

    async getOrdersWithItems(startDate?: Date, endDate?: Date, options: OrderListOptions = {}): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]> {
        // Build conditions for date filtering
        const conditions = [];
        if (startDate) {
            conditions.push(gte(orders.createdAt, startDate));
        }
        if (endDate) {
            conditions.push(lte(orders.createdAt, endDate));
        }
        if (options.beforeId) conditions.push(lt(orders.id, options.beforeId));
        if (options.userId !== undefined) conditions.push(eq(orders.userId, options.userId));
        if (options.status && options.status !== 'all') conditions.push(eq(orders.status, options.status));
        if (options.search) {
            const id = options.search.match(/^(?:#?ORD-)?0*(\d+)$/i);
            conditions.push(id ? eq(orders.id, Number(id[1])) : sql`instr(${foldedOrderName()}, ${options.search.toLowerCase()}) > 0`);
        }
        // Select a bounded page of order IDs BEFORE joining line items, so an
        // order with many items cannot be split or make older orders disappear.
        const ids = options.limit === undefined ? undefined : await this.db.select({ id: orders.id }).from(orders)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(orders.id)).limit(Math.min(100, Math.max(1, options.limit)));
        if (ids && !ids.length) return [];

        // Use a single optimized query with joins to get all data at once
        const query = this.db.select({
            // Order fields
            orderId: orders.id,
            userId: orders.userId,
            customerName: orders.customerName,
            customerEmail: orders.customerEmail,
            customerPhone: orders.customerPhone,
            customerAddress: orders.customerAddress,
            paymentMethod: orders.paymentMethod,
            totalAmount: orders.totalAmount,
            status: orders.status,
            orderCreatedAt: orders.createdAt,

            // Order item fields
            itemId: orderItems.id,
            itemOrderId: orderItems.orderId,
            itemProductId: orderItems.productId,
            itemQuantity: orderItems.quantity,
            itemPrice: orderItems.price,
            itemPackKg: orderItems.packKg,

            // Product fields
            productId: products.id,
            productName: products.name,
            productDescription: products.description,
            productCategory: products.category,
            productPrice: products.price,
            productImageUrl: products.imageUrl,
            productThumbnailUrl: products.thumbnailUrl,
            productStock: products.stock,
            productPackKg: products.packKg,
            productStoreId: products.storeId,
            productCreatedAt: products.createdAt
        })
            .from(orders)
            .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
            .leftJoin(products, eq(orderItems.productId, products.id))
            .orderBy(desc(orders.id));

        // Legacy clients retain their complete history; current clients always
        // request bounded pages. Never truncate a legacy response silently.
        const results = await query.where(ids ? inArray(orders.id, ids.map(row => row.id)) : conditions.length ? and(...conditions) : undefined);

        // Group results by order
        const orderMap = new Map<number, Order & { items: (OrderItem & { product: Product })[] }>();

        for (const row of results) {
            if (!orderMap.has(row.orderId)) {
                orderMap.set(row.orderId, {
                    id: row.orderId,
                    userId: row.userId,
                    customerName: row.customerName,
                    customerEmail: row.customerEmail,
                    customerPhone: row.customerPhone,
                    customerAddress: row.customerAddress,
                    paymentMethod: row.paymentMethod,
                    totalAmount: row.totalAmount,
                    status: row.status,
                    createdAt: row.orderCreatedAt,
                    items: []
                });
            }

            const order = orderMap.get(row.orderId)!;

            // Only add item if it exists (left join might have null values)
            if (row.itemId) {
                order.items.push({
                    id: row.itemId,
                    orderId: row.itemOrderId!,
                    productId: row.itemProductId!,
                    quantity: row.itemQuantity!,
                    price: row.itemPrice!,
                    packKg: row.itemPackKg ?? null,
                    product: {
                        id: row.productId || row.itemProductId!,
                        name: row.productName || `Устгагдсан бүтээгдэхүүн (ID: ${row.itemProductId})`,
                        description: row.productDescription || '',
                        nameRu: null,
                        nameEn: null,
                        descriptionRu: null,
                        descriptionEn: null,
                        badge: null,
                        category: row.productCategory || 'Unknown',
                        price: row.productPrice || row.itemPrice!,
                        imageUrl: row.productImageUrl || '',
                        thumbnailUrl: row.productThumbnailUrl || null,
                        galleryImages: null,
                        stock: row.productStock || 0,
                        minOrderQuantity: 1,
                        packKg: row.productPackKg ?? null,
                        storeId: row.productStoreId || null,
                        createdAt: row.productCreatedAt || new Date()
                    }
                });
            }
        }

        return Array.from(orderMap.values());
    }

    async getOrder(id: number): Promise<Order | undefined> {
        const result = await this.db.select().from(orders).where(eq(orders.id, id));
        return result[0];
    }

    async getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
        const order = await this.getOrder(id);

        if (!order) {
            return undefined;
        }

        const items = await this.db.select()
            .from(orderItems)
            .where(eq(orderItems.orderId, id));

        const itemsWithProducts: (OrderItem & { product: Product })[] = [];

        for (const item of items) {
            let product = await this.getProduct(item.productId);
            if (!product) {
                // Fallback for deleted/missing product
                product = {
                    id: item.productId,
                    name: `Устгагдсан бүтээгдэхүүн (ID: ${item.productId})`,
                    nameRu: null,
                    nameEn: null,
                    description: 'Deleted Product',
                    descriptionRu: null,
                    descriptionEn: null,
                    badge: null,
                    category: 'Unknown',
                    price: item.price,
                    imageUrl: '',
                    thumbnailUrl: null,
                    galleryImages: null,
                    stock: 0,
                    minOrderQuantity: 1,
                    packKg: null,
                    storeId: null,
                    createdAt: new Date()
                };
            }
            itemsWithProducts.push({ ...item, product });
        }

        return { ...order, items: itemsWithProducts };
    }

    async createOrder(order: InsertOrder, items: InsertOrderItem[], receipt?: OrderEmailReceipt): Promise<Order> {
        // D1 batches run as one transaction. MAX(id) refers to the order inserted
        // by the first statement; other transactions cannot interleave this batch.
        const statements: any[] = [this.db.insert(orders).values({
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            paymentMethod: order.paymentMethod || 'bank_transfer',
            totalAmount: order.totalAmount,
            status: 'pending',
            userId: order.userId || null,
        }).returning()];
        if (receipt?.customerEmail) {
            statements.push(this.db.insert(orderEmails).values({
                orderId: sql`(SELECT MAX(id) FROM orders)`,
                payload: JSON.stringify(receipt),
                updatedAt: Date.now(),
            }));
        }
        for (const item of items) {
            statements.push(this.db.insert(orderItems).values({
                orderId: sql`(SELECT MAX(id) FROM orders)`,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                packKg: item.packKg ?? null,
            }));
            statements.push(this.db.update(products).set({
                stock: sql`${products.stock} - ${item.quantity}`,
            }).where(eq(products.id, item.productId)));
        }
        const results = await this.db.batch(statements as [any, ...any[]]);
        return (results[0] as Order[])[0];
    }
    async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
        const result = await this.db.update(orders)
            .set({ status })
            .where(eq(orders.id, id))
            .returning();

        return result[0];
    }

    async deleteOrder(id: number): Promise<boolean> {
        try {
            const results = await this.db.batch([
                this.db.delete(orderEmails).where(eq(orderEmails.orderId, id)),
                this.db.delete(orderItems).where(eq(orderItems.orderId, id)),
                this.db.delete(orders).where(eq(orders.id, id)),
            ]);
            return results[2].meta.changes > 0;
        } catch (error) {
            console.error("Error deleting order:", error);
            return false;
        }
    }

    // User operations
    async getAllUsers(): Promise<User[]> {
        return await this.db.select().from(users).orderBy(desc(users.createdAt));
    }

    async getUser(id: number): Promise<User | undefined> {
        const result = await this.db.select().from(users).where(eq(users.id, id));
        return result[0];
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const result = await this.db.select().from(users).where(eq(users.username, username));
        return result[0];
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const result = await this.db.select().from(users).where(eq(users.email, email));
        return result[0];
    }

    // Admin sign-in looks only at admin accounts (an email match wins), so a member
    // registering the same username or email-like name can never shadow the admin
    async getAdminByLogin(login: string): Promise<User | undefined> {
        const result = await this.db.select().from(users)
            .where(and(eq(users.isAdmin, true), or(eq(users.email, login), eq(users.username, login))))
            .orderBy(desc(sql`${users.email} = ${login}`))
            .limit(1);
        return result[0];
    }

    async getUserByGoogleId(googleId: string): Promise<User | undefined> {
        const result = await this.db.select().from(users).where(eq(users.googleId, googleId));
        return result[0];
    }

    async updateUserGoogleId(userId: number, googleId: string, profileImageUrl?: string): Promise<User | undefined> {
        const updateData: Partial<User> = { googleId };
        if (profileImageUrl) {
            updateData.profileImageUrl = profileImageUrl;
        }
        const result = await this.db.update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning();
        return result[0];
    }

    async createUser(user: InsertUser): Promise<User> {
        const result = await this.db.insert(users).values({
            ...user,
            isAdmin: false
        }).returning();
        return result[0];
    }

    async getUserOrders(userId: number): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]> {
        return this.getOrdersWithItems(undefined, undefined, { userId });
    }

    async getPendingOrdersCount(): Promise<number> {
        const [result] = await this.db.select({ count: sql<number>`count(*)` })
            .from(orders)
            .where(eq(orders.status, 'pending'));
        return Number(result?.count || 0);
    }

    // Highest order id so far; the admin panel uses it to detect newly placed orders
    async getLatestOrderId(): Promise<number> {
        const [row] = await this.db.select({ id: orders.id })
            .from(orders)
            .orderBy(desc(orders.id))
            .limit(1);
        return row?.id ?? 0;
    }

    async getStats(): Promise<{ totalOrders: number, totalSales: number, totalProducts: number, totalUsers: number }> {
        try {
            const [ordersCount] = await this.db.select({ count: sql<number>`count(*)` }).from(orders);
            const [productsCount] = await this.db.select({ count: sql<number>`count(*)` }).from(products);
            const [usersCount] = await this.db.select({ count: sql<number>`count(*)` }).from(users);
            const [salesResult] = await this.db.select({ total: sql<number>`sum(${orders.totalAmount})` }).from(orders);

            return {
                totalOrders: Number(ordersCount?.count || 0),
                totalSales: Number(salesResult?.total || 0),
                totalProducts: Number(productsCount?.count || 0),
                totalUsers: Number(usersCount?.count || 0)
            };
        } catch (error) {
            console.error("Error fetching stats:", error);
            return {
                totalOrders: 0,
                totalSales: 0,
                totalProducts: 0,
                totalUsers: 0
            };
        }
    }

    // Site Content operations (CMS)
    async getSiteContents(): Promise<SiteContent[]> {
        return await this.db.select().from(siteContent);
    }

    async getSiteContentByKey(key: string): Promise<SiteContent | undefined> {
        const result = await this.db.select().from(siteContent).where(eq(siteContent.key, key));
        return result[0];
    }

    async createSiteContent(content: InsertSiteContent): Promise<SiteContent> {
        const result = await this.db.insert(siteContent).values(content).returning();
        return result[0];
    }

    async updateSiteContent(id: number, content: Partial<InsertSiteContent>): Promise<SiteContent | undefined> {
        const result = await this.db.update(siteContent)
            .set({
                ...content,
                updatedAt: new Date()
            })
            .where(eq(siteContent.id, id))
            .returning();
        return result[0];
    }

    async deleteSiteContent(id: number): Promise<boolean> {
        const result = await this.db.delete(siteContent).where(eq(siteContent.id, id));
        return result.meta.changes > 0;
    }

    // Navigation Menu operations (CMS)
    async getNavigationItems(): Promise<NavigationItem[]> {
        return await this.db.select().from(navigationItems).orderBy(asc(navigationItems.order));
    }

    async getNavigationItemsTree(): Promise<NavigationItem[]> {
        const items = await this.getNavigationItems();

        const topLevelItems = items.filter(item => !item.parentId);

        type NavigationItemWithChildren = NavigationItem & { children: NavigationItemWithChildren[] };

        const buildTree = (parentItems: NavigationItem[]): NavigationItemWithChildren[] => {
            return parentItems.map(item => {
                const children = items.filter(i => i.parentId === item.id);
                return {
                    ...item,
                    children: children.length > 0 ? buildTree(children) : []
                };
            });
        };

        return buildTree(topLevelItems);
    }

    async getNavigationItem(id: number): Promise<NavigationItem | undefined> {
        const result = await this.db.select().from(navigationItems).where(eq(navigationItems.id, id));
        return result[0];
    }

    async createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem> {
        const result = await this.db.insert(navigationItems).values(item).returning();
        return result[0];
    }

    async updateNavigationItem(id: number, item: Partial<InsertNavigationItem>): Promise<NavigationItem | undefined> {
        const result = await this.db.update(navigationItems)
            .set(item)
            .where(eq(navigationItems.id, id))
            .returning();
        return result[0];
    }

    async updateNavigationItemsOrder(itemIds: number[]): Promise<boolean> {
        try {
            // Sequential update instead of transaction/batch for simplicity
            for (let i = 0; i < itemIds.length; i++) {
                await this.db.update(navigationItems)
                    .set({ order: i })
                    .where(eq(navigationItems.id, itemIds[i]));
            }
            return true;
        } catch (error) {
            console.error("Error updating navigation item order:", error);
            return false;
        }
    }

    async deleteNavigationItem(id: number): Promise<boolean> {
        const result = await this.db.delete(navigationItems).where(eq(navigationItems.id, id));
        return result.meta.changes > 0;
    }

    // Category operations (CMS)
    async getCategories(): Promise<Category[]> {
        return await this.db.select().from(categories).orderBy(asc(categories.order));
    }

    async getCategory(id: number): Promise<Category | undefined> {
        const result = await this.db.select().from(categories).where(eq(categories.id, id));
        return result[0];
    }

    async getCategoryBySlug(slug: string): Promise<Category | undefined> {
        const result = await this.db.select().from(categories).where(eq(categories.slug, slug));
        return result[0];
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const result = await this.db.insert(categories).values(category).returning();
        return result[0];
    }

    async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
        const result = await this.db.update(categories)
            .set(category)
            .where(eq(categories.id, id))
            .returning();
        return result[0];
    }

    async updateCategoriesOrder(categoryIds: number[]): Promise<boolean> {
        try {
            for (let i = 0; i < categoryIds.length; i++) {
                await this.db.update(categories)
                    .set({ order: i })
                    .where(eq(categories.id, categoryIds[i]));
            }
            return true;
        } catch (error) {
            console.error("Error updating category order:", error);
            return false;
        }
    }

    async deleteCategory(id: number): Promise<boolean> {
        const result = await this.db.delete(categories).where(eq(categories.id, id));
        return result.meta.changes > 0;
    }

    // Media Library operations (CMS)
    async getMediaItems(): Promise<MediaItem[]> {
        return await this.db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt));
    }

    async getMediaItem(id: number): Promise<MediaItem | undefined> {
        const result = await this.db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
        return result[0];
    }

    async createMediaItem(media: InsertMediaItem): Promise<MediaItem> {
        const [existing] = await this.db.select().from(mediaLibrary).where(eq(mediaLibrary.url, media.url)).limit(1);
        if (existing) return existing;
        const result = await this.db.insert(mediaLibrary).values(media).returning();
        return result[0];
    }

    async updateMediaItem(id: number, media: Partial<InsertMediaItem>): Promise<MediaItem | undefined> {
        const result = await this.db.update(mediaLibrary)
            .set(media)
            .where(eq(mediaLibrary.id, id))
            .returning();
        return result[0];
    }

    async deleteMediaItem(id: number): Promise<boolean> {
        const result = await this.db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
        return result.meta.changes > 0;
    }

    // Site Settings operations
    async getSiteSettings(): Promise<SiteSetting[]> {
        return await this.db.select().from(siteSettings);
    }

    async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
        const result = await this.db.select().from(siteSettings).where(eq(siteSettings.key, key));
        return result[0];
    }

    async createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
        const result = await this.db.insert(siteSettings).values(setting).returning();
        return result[0];
    }

    async updateSiteSetting(id: number, setting: Partial<InsertSiteSetting>): Promise<SiteSetting | undefined> {
        const result = await this.db.update(siteSettings)
            .set({
                ...setting,
                updatedAt: new Date()
            })
            .where(eq(siteSettings.id, id))
            .returning();

        return result[0];
    }

    async updateSiteSettingByKey(key: string, value: string): Promise<SiteSetting | undefined> {
        const existing = await this.getSiteSettingByKey(key);

        if (!existing) {
            return undefined;
        }

        const result = await this.db.update(siteSettings)
            .set({
                value,
                updatedAt: new Date()
            })
            .where(eq(siteSettings.key, key))
            .returning();

        return result[0];
    }

    // Bank Account operations
    async getBankAccounts(): Promise<BankAccount[]> {
        return await this.db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName));
    }

    async getDefaultBankAccount(): Promise<BankAccount | undefined> {
        const result = await this.db.select().from(bankAccounts)
            .where(eq(bankAccounts.isDefault, true))
            .limit(1);

        if (!result.length) {
            const allAccounts = await this.db.select().from(bankAccounts).limit(1);

            if (allAccounts.length > 0) {
                const account = allAccounts[0];
                await this.setDefaultBankAccount(account.id);
                return account;
            }
        }

        return result[0];
    }

    async getBankAccount(id: number): Promise<BankAccount | undefined> {
        const result = await this.db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
        return result[0];
    }

    async createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount> {
        if (bankAccount.isDefault) {
            await this.db.update(bankAccounts)
                .set({ isDefault: false })
                .where(eq(bankAccounts.isDefault, true));
        }

        const dataToInsert = {
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            accountHolder: bankAccount.accountHolder,
            description: bankAccount.description === "" ? null : bankAccount.description,
            isDefault: bankAccount.isDefault === true,
            isActive: bankAccount.isActive === undefined ? true : bankAccount.isActive === true,
        };

        const [result] = await this.db.insert(bankAccounts).values(dataToInsert).returning();
        return result;
    }

    async updateBankAccount(id: number, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
        if (bankAccount.isDefault) {
            await this.db.update(bankAccounts)
                .set({ isDefault: false })
                .where(and(
                    eq(bankAccounts.isDefault, true),
                    not(eq(bankAccounts.id, id))
                ));
        }

        const dataToUpdate: Record<string, any> = {};
        if (bankAccount.bankName !== undefined) dataToUpdate.bankName = bankAccount.bankName;
        if (bankAccount.accountNumber !== undefined) dataToUpdate.accountNumber = bankAccount.accountNumber;
        if (bankAccount.accountHolder !== undefined) dataToUpdate.accountHolder = bankAccount.accountHolder;
        if (bankAccount.description !== undefined) dataToUpdate.description = bankAccount.description;
        if (bankAccount.isDefault !== undefined) dataToUpdate.isDefault = bankAccount.isDefault === true;
        if (bankAccount.isActive !== undefined) dataToUpdate.isActive = bankAccount.isActive === true;

        const result = await this.db.update(bankAccounts)
            .set(dataToUpdate)
            .where(eq(bankAccounts.id, id))
            .returning();

        return result[0];
    }

    async deleteBankAccount(id: number): Promise<boolean> {
        const account = await this.getBankAccount(id);
        if (account && account.isDefault) {
            return false;
        }
        const result = await this.db.delete(bankAccounts).where(eq(bankAccounts.id, id));
        return result.meta.changes > 0;
    }

    async setDefaultBankAccount(id: number): Promise<boolean> {
        await this.db.update(bankAccounts)
            .set({ isDefault: false })
            .where(eq(bankAccounts.isDefault, true));

        const result = await this.db.update(bankAccounts)
            .set({ isDefault: true })
            .where(eq(bankAccounts.id, id))
            .returning();

        return result.length > 0;
    }

    // Footer settings methods
    async getFooterSettings(): Promise<FooterSetting | undefined> {
        const [footerSetting] = await this.db
            .select()
            .from(footerSettings)
            .limit(1);

        return footerSetting;
    }

    async updateFooterSettings(settings: Partial<InsertFooterSetting>): Promise<FooterSetting> {
        const existingSettings = await this.getFooterSettings();

        if (!existingSettings) {
            const [newSettings] = await this.db
                .insert(footerSettings)
                .values({
                    companyName: settings.companyName || "Герин Мах",
                    description: settings.description || "Чанартай махны бүтээгдэхүүн",
                    address: settings.address || "Улаанбаатар хот, Монгол улс",
                    phone: settings.phone || "976-00-000000",
                    email: settings.email || "maidargantuu120@gmail.com",
                    copyrightText: settings.copyrightText || `© ${new Date().getFullYear()} Герин Мах. Бүх эрх хуулиар хамгаалагдсан.`,
                    logoUrl: settings.logoUrl,
                    socialLinks: settings.socialLinks || {},
                    quickLinks: settings.quickLinks || []
                })
                .returning();

            return newSettings;
        }

        const [updatedSettings] = await this.db
            .update(footerSettings)
            .set({
                ...settings,
                updatedAt: new Date()
            })
            .where(eq(footerSettings.id, existingSettings.id))
            .returning();

        return updatedSettings;
    }

    // Meal Kit operations
    async getMealKits(): Promise<MealKit[]> {
        return await this.db.select().from(mealKits).where(eq(mealKits.isActive, true)).orderBy(asc(mealKits.name));
    }

    async getMealKit(id: number): Promise<(MealKit & { components: (MealKitComponent & { product: Product })[] }) | undefined> {
        const result = await this.db.select().from(mealKits).where(eq(mealKits.id, id));
        const mealKit = result[0];

        if (!mealKit) return undefined;

        const components = await this.getMealKitComponents(id);

        return { ...mealKit, components };
    }

    async createMealKit(mealKit: InsertMealKit): Promise<MealKit> {
        const result = await this.db.insert(mealKits).values(mealKit).returning();
        return result[0];
    }

    async updateMealKit(id: number, mealKit: Partial<InsertMealKit>): Promise<MealKit | undefined> {
        const result = await this.db.update(mealKits)
            .set(mealKit)
            .where(eq(mealKits.id, id))
            .returning();

        return result[0];
    }

    async deleteMealKit(id: number): Promise<boolean> {
        await this.db.delete(mealKitComponents).where(eq(mealKitComponents.mealKitId, id));
        const result = await this.db.delete(mealKits).where(eq(mealKits.id, id));
        return result.meta.changes > 0;
    }

    // Meal Kit Component operations
    async getMealKitComponents(mealKitId: number): Promise<(MealKitComponent & { product: Product })[]> {
        const components = await this.db.select()
            .from(mealKitComponents)
            .where(eq(mealKitComponents.mealKitId, mealKitId))
            .orderBy(asc(mealKitComponents.id));

        const componentsWithProducts: (MealKitComponent & { product: Product })[] = [];

        for (const component of components) {
            const product = await this.getProduct(component.productId);
            if (product) {
                componentsWithProducts.push({ ...component, product });
            }
        }

        return componentsWithProducts;
    }

    async createMealKitComponent(component: InsertMealKitComponent): Promise<MealKitComponent> {
        const result = await this.db.insert(mealKitComponents).values(component).returning();
        return result[0];
    }

    async updateMealKitComponent(id: number, component: Partial<InsertMealKitComponent>): Promise<MealKitComponent | undefined> {
        const result = await this.db.update(mealKitComponents)
            .set(component)
            .where(eq(mealKitComponents.id, id))
            .returning();

        return result[0];
    }

    async deleteMealKitComponent(id: number): Promise<boolean> {
        const result = await this.db.delete(mealKitComponents).where(eq(mealKitComponents.id, id));
        return result.meta.changes > 0;
    }

    // Generated Meal Kit operations
    async getGeneratedMealKits(userId?: number, sessionId?: string): Promise<GeneratedMealKit[]> {
        if (userId) {
            return await this.db.select()
                .from(generatedMealKits)
                .where(eq(generatedMealKits.userId, userId))
                .orderBy(desc(generatedMealKits.createdAt));
        } else if (sessionId) {
            return await this.db.select()
                .from(generatedMealKits)
                .where(eq(generatedMealKits.sessionId, sessionId))
                .orderBy(desc(generatedMealKits.createdAt));
        } else {
            return await this.db.select()
                .from(generatedMealKits)
                .orderBy(desc(generatedMealKits.createdAt));
        }
    }

    async getGeneratedMealKit(id: number): Promise<(GeneratedMealKit & { components: (GeneratedMealKitComponent & { product: Product })[] }) | undefined> {
        const result = await this.db.select().from(generatedMealKits).where(eq(generatedMealKits.id, id));
        const mealKit = result[0];

        if (!mealKit) return undefined;

        const components = await this.getGeneratedMealKitComponents(id);

        return { ...mealKit, components };
    }

    async createGeneratedMealKit(mealKit: InsertGeneratedMealKit, components: InsertGeneratedMealKitComponent[]): Promise<GeneratedMealKit> {
        // Direct insertion for now as D1 batch/transaction pattern is different or not fully standardized in this snippet context
        // but we can assume sequential is fine for this low volume
        const [generatedKit] = await this.db.insert(generatedMealKits).values(mealKit).returning();

        for (const component of components) {
            await this.db.insert(generatedMealKitComponents).values({
                ...component,
                generatedMealKitId: generatedKit.id
            });
        }
        return generatedKit;
    }

    async updateGeneratedMealKit(id: number, mealKit: Partial<InsertGeneratedMealKit>): Promise<GeneratedMealKit | undefined> {
        const result = await this.db.update(generatedMealKits)
            .set(mealKit)
            .where(eq(generatedMealKits.id, id))
            .returning();

        return result[0];
    }

    async deleteGeneratedMealKit(id: number): Promise<boolean> {
        await this.db.delete(generatedMealKitComponents).where(eq(generatedMealKitComponents.generatedMealKitId, id));
        const result = await this.db.delete(generatedMealKits).where(eq(generatedMealKits.id, id));
        return result.meta.changes > 0;
    }

    // Generated Meal Kit Component operations
    async getGeneratedMealKitComponents(mealKitId: number): Promise<(GeneratedMealKitComponent & { product: Product })[]> {
        const components = await this.db.select()
            .from(generatedMealKitComponents)
            .where(eq(generatedMealKitComponents.generatedMealKitId, mealKitId));

        const componentsWithProducts: (GeneratedMealKitComponent & { product: Product })[] = [];

        for (const component of components) {
            const product = await this.getProduct(component.productId);
            if (product) {
                componentsWithProducts.push({ ...component, product });
            }
        }

        return componentsWithProducts;
    }

    // One-click meal kit generation
    async generateMealKit(
        params: {
            userId?: number;
            sessionId?: string;
            name: string;
            productIds: number[];
            quantities?: Record<number, number>;
        }
    ): Promise<GeneratedMealKit & { components: (GeneratedMealKitComponent & { product: Product })[] }> {
        const { userId, sessionId, name, productIds, quantities = {} } = params;

        let totalPrice = 0;
        const componentData: InsertGeneratedMealKitComponent[] = [];

        for (const productId of productIds) {
            const product = await this.getProduct(productId);

            if (product) {
                const quantity = quantities[productId] || 1;
                const price = parseFloat(product.price.toString()) * quantity;
                totalPrice += price;

                componentData.push({
                    generatedMealKitId: 0, // Placeholder, updated in batch or subsequent step
                    productId,
                    quantity: quantity,
                    price: price
                });
                // Correcting types: TS should see numbers for real.
                // Let's cast to any to be safe or fix logic. `product.price` is now number.
            }
        }

        // In new schema, price/quantity are real/number.
        // Re-adjusting componentData construction to use numbers.
        const realComponentData = componentData.map(c => ({
            ...c,
            quantity: typeof c.quantity === 'string' ? parseFloat(c.quantity) : c.quantity,
            price: typeof c.price === 'string' ? parseFloat(c.price) : c.price
        }));

        const [generatedKit] = await this.db.insert(generatedMealKits).values({
            userId,
            sessionId,
            name,
            totalPrice: totalPrice,
            isAddedToCart: false
        }).returning();

        const createdComponents: (GeneratedMealKitComponent & { product: Product })[] = [];

        for (const component of realComponentData) {
            const [newComponent] = await this.db.insert(generatedMealKitComponents).values({
                ...component,
                generatedMealKitId: generatedKit.id
            }).returning();

            const product = await this.getProduct(newComponent.productId);
            if (product) {
                createdComponents.push({ ...newComponent, product });
            }
        }

        return { ...generatedKit, components: createdComponents };
    }

    // Non-delivery day operations
    async getNonDeliveryDays(): Promise<NonDeliveryDay[]> {
        return await this.db.select().from(nonDeliveryDays);
    }

    async getNonDeliveryDay(id: number): Promise<NonDeliveryDay | undefined> {
        const result = await this.db.select().from(nonDeliveryDays).where(eq(nonDeliveryDays.id, id));
        return result[0];
    }

    async createNonDeliveryDay(day: InsertNonDeliveryDay): Promise<NonDeliveryDay> {
        const result = await this.db.insert(nonDeliveryDays).values(day).returning();
        return result[0];
    }

    async updateNonDeliveryDay(id: number, day: Partial<InsertNonDeliveryDay>): Promise<NonDeliveryDay | undefined> {
        const result = await this.db.update(nonDeliveryDays)
            .set(day)
            .where(eq(nonDeliveryDays.id, id))
            .returning();
        return result[0];
    }

    async deleteNonDeliveryDay(id: number): Promise<boolean> {
        const result = await this.db.delete(nonDeliveryDays).where(eq(nonDeliveryDays.id, id));
        return result.meta.changes > 0;
    }

    // Delivery settings operations
    async getDeliverySettings(): Promise<DeliverySetting | undefined> {
        const result = await this.db.select().from(deliverySettings).limit(1);
        return result[0];
    }

    async updateDeliverySettings(settings: Partial<InsertDeliverySetting>): Promise<DeliverySetting> {
        const existing = await this.getDeliverySettings();

        if (!existing) {
            const [newSettings] = await this.db.insert(deliverySettings).values({
                cutoffHour: settings.cutoffHour ?? 18,
                cutoffMinute: settings.cutoffMinute ?? 30,
                processingDays: settings.processingDays ?? 1
            }).returning();
            return newSettings;
        }

        const [updated] = await this.db.update(deliverySettings)
            .set({
                ...settings,
                updatedAt: new Date()
            })
            .where(eq(deliverySettings.id, existing.id))
            .returning();

        return updated;
    }

    // Review operations
    async getReviews(): Promise<Review[]> {
        return await this.db.select().from(reviews).orderBy(desc(reviews.createdAt));
    }

    async getApprovedReviews(): Promise<Review[]> {
        return await this.db.select().from(reviews)
            .where(eq(reviews.isApproved, true))
            .orderBy(desc(reviews.createdAt));
    }

    async getReview(id: number): Promise<Review | undefined> {
        const result = await this.db.select().from(reviews).where(eq(reviews.id, id));
        return result[0];
    }

    async createReview(review: InsertReview): Promise<Review> {
        const result = await this.db.insert(reviews).values(review).returning();
        return result[0];
    }

    async updateReview(id: number, review: Partial<InsertReview & { isApproved: boolean }>): Promise<Review | undefined> {
        const result = await this.db.update(reviews)
            .set(review)
            .where(eq(reviews.id, id))
            .returning();
        return result[0];
    }

    async deleteReview(id: number): Promise<boolean> {
        const result = await this.db.delete(reviews).where(eq(reviews.id, id));
        return result.meta.changes > 0;
    }

    async uploadFile(bucket: string, path: string, file: File): Promise<string> {
        await validateImageFile(file);
        const bytes = await file.arrayBuffer();
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        path = `${path.split('/')[0]}/${Array.from(digest).map(value => value.toString(16).padStart(2,'0')).join('')}.webp`;
        if (!this.bucket) {
            console.error("R2 Bucket not configured");
            throw new Error("R2 Bucket not configured");
        }

        try {
            if (await this.bucket.head(path)) return `/uploads/${path}`;
            await this.bucket.put(path, bytes, {
                httpMetadata: { contentType: file.type }
            });

            // Assuming public access is enabled or mapped to a custom domain
            // For now, returning a relative path or a standard R2 dev URL format if known.
            // Since we don't have a custom domain in env yet, we'll assume a placeholder or relative if served via worker.
            // Ideally should be Env var.
            return `/uploads/${path}`;
        } catch (error) {
            console.error("R2 Upload Error:", error);
            throw error;
        }
    }
}
