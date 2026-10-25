import {
  products, type Product, type InsertProduct,
  orders, type Order, type InsertOrder,
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
import { db } from "./db";
import { eq, desc, and, asc, not, gte, lte, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
  getOrdersWithItems(startDate?: Date, endDate?: Date): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;

  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUserGoogleId(userId: number, googleId: string, profileImageUrl?: string): Promise<User | undefined>;
  updateUserAdmin(userId: number, isAdmin: boolean): Promise<User | undefined>;
  getUserOrders(userId: number): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]>;
  getPendingOrdersCount(): Promise<number>;

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
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize the database with default data
    this.initializeDatabase().catch(console.error);
  }

  // Service Category operations
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories);
  }

  async getServiceCategoryBySlug(slug: string): Promise<ServiceCategory | undefined> {
    const result = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, slug));
    return result[0];
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const result = await db.insert(serviceCategories).values(category).returning();
    return result[0];
  }

  async updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
    const result = await db.update(serviceCategories)
      .set(category)
      .where(eq(serviceCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceCategory(id: number): Promise<boolean> {
    const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Store operations
  async getStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async getStoresByCategory(categoryId: number): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.categoryId, categoryId));
  }

  async getStoresByCategorySlug(slug: string): Promise<Store[]> {
    const category = await this.getServiceCategoryBySlug(slug);
    if (!category) return [];

    return await db.select().from(stores).where(eq(stores.categoryId, category.id));
  }

  async getStore(id: number): Promise<Store | undefined> {
    const result = await db.select().from(stores).where(eq(stores.id, id));
    return result[0];
  }

  async getStoreWithProducts(id: number): Promise<(Store & { products: Product[] }) | undefined> {
    const store = await this.getStore(id);
    if (!store) return undefined;

    const storeProducts = await db.select().from(products).where(eq(products.storeId, id));

    return {
      ...store,
      products: storeProducts
    };
  }

  async createStore(store: InsertStore): Promise<Store> {
    const result = await db.insert(stores).values(store).returning();
    return result[0];
  }

  async updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
    const result = await db.update(stores)
      .set(store)
      .where(eq(stores.id, id))
      .returning();
    return result[0];
  }

  async deleteStore(id: number): Promise<boolean> {
    const result = await db.delete(stores).where(eq(stores.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  private async initializeDatabase() {
    try {
      // Check if we have default shipping fee setting
      const shippingRulesSetting = await this.getSiteSettingByKey("shipping_rules");

      if (!shippingRulesSetting) {
        // Create default shipping rules setting
        await this.createSiteSetting({
          key: "shipping_rules",
          value: JSON.stringify([
            { min: 0, max: 4, fee: 5700 },
            { min: 5, max: 8, fee: 6200 },
            { min: 9, max: 11, fee: 6700 },
            { min: 12, max: 14, fee: 8000 },
            { min: 15, max: 18, fee: 9500 },
            { min: 18, max: 9999, fee: 9500 }
          ]),
          description: "Dynamic shipping rules"
        });
        console.log("Default shipping rules setting created");
      }

      // Check if we already have any products
      const existingProducts = await db.select().from(products);

      if (existingProducts.length === 0) {
        // Add initial products
        await db.insert(products).values([
          {
            name: "Үхрийн мах",
            description: "Шинэ, чанартай үхрийн махыг танд санал болгож байна.",
            category: "Үхрийн мах",
            price: "15000",
            imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&h=300",
            stock: 50,
          },
          {
            name: "Хонины мах",
            description: "Цэвэр бэлчээрийн хонины шинэ мах.",
            category: "Хонины мах",
            price: "13500",
            imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=500&h=300",
            stock: 45,
          },
          {
            name: "Тахианы мах",
            description: "Органик тахианы цээж, шар махтай.",
            category: "Тахианы мах",
            price: "9800",
            imageUrl: "https://images.unsplash.com/photo-1615887087343-6a32f45ac0f1?auto=format&fit=crop&w=500&h=300",
            stock: 60,
          },
          {
            name: "Гахайн мах",
            description: "Чанартай гахайн хавирга.",
            category: "Гахайн мах",
            price: "12200",
            imageUrl: "https://images.unsplash.com/photo-1594044152669-0ca46591e90c?auto=format&fit=crop&w=500&h=300",
            stock: 40,
          },
          {
            name: "Үхрийн дотор эрхтэн",
            description: "Шинэ үхрийн элэг болон бөөр.",
            category: "Бусад",
            price: "8900",
            imageUrl: "https://images.unsplash.com/photo-1545155226-61f273e3638a?auto=format&fit=crop&w=500&h=300",
            stock: 30,
          },
          {
            name: "Кебаб",
            description: "Бэлэн кебаб, хонины махаар хийсэн.",
            category: "Бусад",
            price: "18500",
            imageUrl: "https://images.unsplash.com/photo-1628268909376-e8c44bb3153b?auto=format&fit=crop&w=500&h=300",
            stock: 25,
          },
        ]);
      }

      // Check if we already have any users
      const existingUsers = await db.select().from(users);

      if (existingUsers.length === 0) {
        // Generate hashed password
        const salt = randomBytes(16).toString("hex");
        const password = process.env.ADMIN_DEFAULT_PASSWORD;
        if (!password) {
          throw new Error("ADMIN_DEFAULT_PASSWORD environment variable is required for initial admin setup");
        }
        const passwordBuf = (await scryptAsync(password, salt, 64)) as Buffer;
        const hashedPassword = `${passwordBuf.toString("hex")}.${salt}`;

        // Add admin user with properly hashed password
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword,
          email: "admin@gerinmah.mn",
          name: "Administrator",
          isAdmin: true
        });
      }

      // Check if we already have categories
      const existingCategories = await db.select().from(categories);

      if (existingCategories.length === 0) {
        // Add initial categories
        await db.insert(categories).values([
          {
            name: "Үхрийн мах",
            slug: "beef",
            description: "Шинэ, чанартай үхрийн мах бүтээгдэхүүн",
            imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&h=300",
            order: 0,
            isActive: true
          },
          {
            name: "Хонины мах",
            slug: "lamb",
            description: "Цэвэр бэлчээрийн хонины шинэ мах бүтээгдэхүүн",
            imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=500&h=300",
            order: 1,
            isActive: true
          },
          {
            name: "Тахианы мах",
            slug: "chicken",
            description: "Органик тахианы мах бүтээгдэхүүн",
            imageUrl: "https://images.unsplash.com/photo-1615887087343-6a32f45ac0f1?auto=format&fit=crop&w=500&h=300",
            order: 2,
            isActive: true
          },
          {
            name: "Гахайн мах",
            slug: "pork",
            description: "Чанартай гахайн мах бүтээгдэхүүн",
            imageUrl: "https://images.unsplash.com/photo-1594044152669-0ca46591e90c?auto=format&fit=crop&w=500&h=300",
            order: 3,
            isActive: true
          },
          {
            name: "Бусад",
            slug: "other",
            description: "Бусад төрлийн мах, дайвар бүтээгдэхүүн",
            imageUrl: "https://images.unsplash.com/photo-1545155226-61f273e3638a?auto=format&fit=crop&w=500&h=300",
            order: 4,
            isActive: true
          }
        ]);
      }

      // Check if we already have navigation items
      const existingNavItems = await db.select().from(navigationItems);

      if (existingNavItems.length === 0) {
        // Add initial navigation items
        await db.insert(navigationItems).values([
          {
            title: "Нүүр",
            url: "/",
            order: 0,
            isActive: true
          },
          {
            title: "Үхрийн мах",
            url: "/category/beef",
            order: 1,
            isActive: true
          },
          {
            title: "Хонины мах",
            url: "/category/lamb",
            order: 2,
            isActive: true
          },
          {
            title: "Тахианы мах",
            url: "/category/chicken",
            order: 3,
            isActive: true
          },
          {
            title: "Гахайн мах",
            url: "/category/pork",
            order: 4,
            isActive: true
          },
          {
            title: "Бусад",
            url: "/category/other",
            order: 5,
            isActive: true
          },
          {
            title: "Холбоо барих",
            url: "/contact",
            order: 6,
            isActive: true
          }
        ]);
      }

      // Check if we already have site content
      const existingSiteContent = await db.select().from(siteContent);

      if (existingSiteContent.length === 0) {
        // Add initial site content
        await db.insert(siteContent).values([
          {
            key: "home_hero",
            title: "Шинэ, чанартай мах",
            content: "<p>Өдөр бүр шинэ мах, хамгийн чанартай бүтээгдэхүүн. Монголын хамгийн сайн фермерүүдээс шууд нийлүүлэгддэг.</p>",
            imageUrl: "https://images.unsplash.com/photo-1551024559-b33e1a0702e5?auto=format&fit=crop&w=1920&h=800&q=80",
            active: true
          },
          {
            key: "home_about",
            title: "Бидний тухай",
            content: "<p>Бид 2010 оноос хойш үйл ажиллагаа явуулж байна. Манай зорилго бол Монголын хэрэглэгчдэд хамгийн чанартай, шинэ бүтээгдэхүүнийг хүргэх юм.</p>",
            active: true
          },
          {
            key: "contact_info",
            title: "Холбоо барих мэдээлэл",
            content: "<p>Хаяг: Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо</p><p>Утас: +976 9911-2233</p><p>И-мэйл: info@gerinmah.mn</p>",
            active: true
          },
          {
            key: "footer_text",
            title: "Хөл хэсгийн мэдээлэл",
            content: "<p>&copy; 2025 Герийн Мах ХХК. Бүх эрх хуулиар хамгаалагдсан.</p>",
            active: true
          }
        ]);
      }

      // Check if we already have service categories
      const existingServiceCategories = await db.select().from(serviceCategories);

      if (existingServiceCategories.length === 0) {
        // Add initial service categories
        await db.insert(serviceCategories).values([
          {
            name: "Махны дэлгүүр",
            description: "Чанартай шинэ мах худалдаалдаг дэлгүүрүүд",
            iconName: "local_dining",
            slug: "meat-store",
            isActive: true,
          },
          {
            name: "Хоолны газар",
            description: "Монгол ресторанууд, хоолны газрууд",
            iconName: "restaurant",
            slug: "restaurant",
            isActive: true,
          },
          {
            name: "Карго үйлчилгээ",
            description: "Солонгосоос Монгол руу бараа тээвэрлэх үйлчилгээ",
            iconName: "local_shipping",
            slug: "cargo",
            isActive: true,
          },
          {
            name: "Орчуулга",
            description: "Солонгос-Монгол хэлний орчуулга, хэлмэрч",
            iconName: "translate",
            slug: "translation",
            isActive: true,
          },
          {
            name: "Айл хөлсөлж өгөх",
            description: "Солонгост түрээсийн байр, өрөө хайж байгаа хүмүүст",
            iconName: "apartment",
            slug: "apartment",
            isActive: true,
          },
          {
            name: "Авто засвар",
            description: "Монгол автомашины засвар, сэлбэг",
            iconName: "car_repair",
            slug: "car-repair",
            isActive: true,
          },
          {
            name: "Үсчин, гоо сайхан",
            description: "Монгол үсчин, гоо сайхны салон",
            iconName: "content_cut",
            slug: "beauty-salon",
            isActive: true,
          },
          {
            name: "Сургалт",
            description: "Солонгос хэл болон бусад төрлийн сургалтууд",
            iconName: "school",
            slug: "education",
            isActive: true,
          },
          {
            name: "Эрүүл мэнд",
            description: "Эрүүл мэндийн үйлчилгээ, эмнэлэг, эмийн сан",
            iconName: "medical_services",
            slug: "health",
            isActive: true,
          },
          {
            name: "Худалдаа",
            description: "Монгол бараа бүтээгдэхүүн худалдаалах дэлгүүрүүд",
            iconName: "store",
            slug: "store",
            isActive: true,
          },
          {
            name: "Хуулийн зөвлөгөө",
            description: "Хууль, эрх зүйн туслалцаа, визний асуудал",
            iconName: "gavel",
            slug: "legal",
            isActive: true,
          },
          {
            name: "Бусад",
            description: "Бусад төрлийн үйлчилгээ, байгууллагууд",
            iconName: "category",
            slug: "other-services",
            isActive: true,
          }
        ]);
      }

      // Create sample store if none exists
      const existingStores = await db.select().from(stores);

      if (existingStores.length === 0) {
        // Find the meat store category ID 
        const meatStoreCategory = await this.getServiceCategoryBySlug("meat-store");

        if (meatStoreCategory) {
          // Find an admin user
          const adminUser = await this.getUserByUsername("admin");

          if (adminUser) {
            // Create a sample store 
            await db.insert(stores).values({
              name: "Max махны дэлгүүр",
              description: "Шинэ, чанартай махны бүтээгдэхүүн. Үхэр, хонь, ямаа, тахианы мах.",
              logoUrl: "/uploads/max-meat-logo.png",
              coverImageUrl: "/uploads/max-meat-cover.jpg",
              address: "Сөүл хот, Каннам дүүрэг, 123 гудамж",
              phone: "010-1234-5678",
              email: "info@maxmeat.mn",
              openingHours: {},
              categoryId: meatStoreCategory.id,
              userId: adminUser.id,
              isActive: true,
              isVerified: true
            });
          }
        }
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async updateUserAdmin(userId: number, isAdmin: boolean): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.category, category));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();

    return result[0];
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
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
      return await db.select()
        .from(orders)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(orders.createdAt));
    } else {
      // No filters, return all orders
      return await db.select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
    }
  }

  async getOrdersWithItems(startDate?: Date, endDate?: Date): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]> {
    // Build conditions for date filtering
    const conditions = [];
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, endDate));
    }

    // Use a single optimized query with joins to get all data at once
    const query = db.select({
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

      // Product fields
      productId: products.id,
      productName: products.name,
      productDescription: products.description,
      productCategory: products.category,
      productPrice: products.price,
      productImageUrl: products.imageUrl,
      productStock: products.stock,
      productStoreId: products.storeId,
      productCreatedAt: products.createdAt
    })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .orderBy(desc(orders.createdAt));

    // Apply date filtering if conditions exist
    const results = conditions.length > 0
      ? await query.where(conditions.length > 1 ? and(...conditions) : conditions[0])
      : await query;

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
          product: {
            id: row.productId || row.itemProductId!,
            name: row.productName || `Устгагдсан бүтээгдэхүүн (ID: ${row.itemProductId})`,
            description: row.productDescription || '',
            nameRu: null,
            nameEn: null,
            descriptionRu: null,
            descriptionEn: null,
            category: row.productCategory || 'Unknown',
            price: row.productPrice || row.itemPrice!,
            imageUrl: row.productImageUrl || '',
            thumbnailUrl: row.productThumbnailUrl || null,
            stock: row.productStock || 0,
            minOrderQuantity: 1,
            storeId: row.productStoreId || null,
            createdAt: row.productCreatedAt || new Date()
          }
        });
      }
    }

    return Array.from(orderMap.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    const order = await this.getOrder(id);

    if (!order) {
      return undefined;
    }

    const items = await db.select()
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
          category: 'Unknown',
          price: item.price,
          imageUrl: '',
          thumbnailUrl: null,
          stock: 0,
          minOrderQuantity: 1,
          storeId: null,
          createdAt: new Date()
        };
      }
      itemsWithProducts.push({ ...item, product });
    }

    return { ...order, items: itemsWithProducts };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    console.log("Creating order with data:", order);
    console.log("Order items:", items);

    try {
      const result = await db.transaction(async (tx) => {
        // Insert the order with explicit totalAmount and userId if provided
        const [newOrder] = await tx.insert(orders).values({
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          totalAmount: order.totalAmount,
          status: "pending",
          userId: order.userId || null
        }).returning();

        console.log("Order inserted successfully:", newOrder);

        // Insert all order items
        for (const item of items) {
          console.log("Processing order item:", item);

          const orderItem = {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          };

          const [insertedItem] = await tx.insert(orderItems).values(orderItem).returning();
          console.log("Order item inserted:", insertedItem);

          // Update product stock
          const product = await this.getProduct(item.productId);
          if (product) {
            await tx.update(products)
              .set({ stock: product.stock - item.quantity })
              .where(eq(products.id, item.productId));
            console.log(`Updated stock for product ${item.productId}`);
          }
        }

        return newOrder;
      });

      console.log("Transaction completed successfully");
      return result;
    } catch (error) {
      console.error("Error in createOrder transaction:", error);
      throw error;
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    return result[0];
  }

  async deleteOrder(id: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Delete order items first to maintain referential integrity
        await tx.delete(orderItems).where(eq(orderItems.orderId, id));
        // Delete the order itself
        await tx.delete(orders).where(eq(orders.id, id));
      });
      return true;
    } catch (error) {
      console.error("Error deleting order:", error);
      return false;
    }
  }

  async getAllOrders(): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]> {
    // Get all orders
    const allOrders = await db.select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    // Initialize the result array
    const result: (Order & { items: (OrderItem & { product: Product })[] })[] = [];

    // For each order, get its items and corresponding products
    for (const order of allOrders) {
      const items = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

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
            category: 'Unknown',
            price: item.price,
            imageUrl: '',
            thumbnailUrl: null,
            stock: 0,
            minOrderQuantity: 1,
            storeId: null,
            createdAt: new Date()
          };
        }
        itemsWithProducts.push({ ...item, product });
      }

      result.push({ ...order, items: itemsWithProducts });
    }

    return result;
  }

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    // Get the order by ID
    const orderResult = await db.select()
      .from(orders)
      .where(eq(orders.id, id));

    if (orderResult.length === 0) {
      return undefined;
    }

    const order = orderResult[0];

    // Get order items
    const items = await db.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const itemsWithProducts: (OrderItem & { product: Product })[] = [];

    // Get product details for each item
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
          category: 'Unknown',
          price: item.price,
          imageUrl: '',
          thumbnailUrl: null,
          stock: 0,
          minOrderQuantity: 1,
          storeId: null,
          createdAt: new Date()
        };
      }
      itemsWithProducts.push({ ...item, product });
    }

    return { ...order, items: itemsWithProducts };
  }

  // User operations
  async getAllUsers(): Promise<User[]> {
    // 회원 가입 날짜(createdAt) 기준으로 최신순(내림차순) 정렬
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId));
    return result[0];
  }

  async updateUserGoogleId(userId: number, googleId: string, profileImageUrl?: string): Promise<User | undefined> {
    const updateData: Partial<User> = { googleId };
    if (profileImageUrl) {
      updateData.profileImageUrl = profileImageUrl;
    }
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...user,
      isAdmin: false
    }).returning();
    return result[0];
  }

  async getUserOrders(userId: number): Promise<(Order & { items: (OrderItem & { product: Product })[] })[]> {
    // First get all orders for this user
    const userOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // Initialize the result array
    const result: (Order & { items: (OrderItem & { product: Product })[] })[] = [];

    // For each order, get its items and corresponding products
    for (const order of userOrders) {
      const items = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const itemsWithProducts: (OrderItem & { product: Product })[] = [];

      for (const item of items) {
        const product = await this.getProduct(item.productId);
        if (product) {
          itemsWithProducts.push({ ...item, product });
        }
      }

      result.push({ ...order, items: itemsWithProducts });
    }

    return result;
  }

  async getPendingOrdersCount(): Promise<number> {
    const result = await db.select()
      .from(orders)
      .where(eq(orders.status, 'pending'));
    return result.length;
  }

  // Site Content operations (CMS)
  async getSiteContents(): Promise<SiteContent[]> {
    return await db.select().from(siteContent);
  }

  async getSiteContentByKey(key: string): Promise<SiteContent | undefined> {
    const result = await db.select().from(siteContent).where(eq(siteContent.key, key));
    return result[0];
  }

  async createSiteContent(content: InsertSiteContent): Promise<SiteContent> {
    const result = await db.insert(siteContent).values(content).returning();
    return result[0];
  }

  async updateSiteContent(id: number, content: Partial<InsertSiteContent>): Promise<SiteContent | undefined> {
    const result = await db.update(siteContent)
      .set({
        ...content,
        updatedAt: new Date()
      })
      .where(eq(siteContent.id, id))
      .returning();
    return result[0];
  }

  async deleteSiteContent(id: number): Promise<boolean> {
    const result = await db.delete(siteContent).where(eq(siteContent.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Navigation Menu operations (CMS)
  async getNavigationItems(): Promise<NavigationItem[]> {
    return await db.select().from(navigationItems).orderBy(asc(navigationItems.order));
  }

  async getNavigationItemsTree(): Promise<NavigationItem[]> {
    const items = await this.getNavigationItems();

    // Filter top-level items (parentId is null)
    const topLevelItems = items.filter(item => !item.parentId);

    // Define a type for the NavigationItem with children
    type NavigationItemWithChildren = NavigationItem & { children: NavigationItemWithChildren[] };

    // Build tree by adding children to parent items
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
    const result = await db.select().from(navigationItems).where(eq(navigationItems.id, id));
    return result[0];
  }

  async createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem> {
    const result = await db.insert(navigationItems).values(item).returning();
    return result[0];
  }

  async updateNavigationItem(id: number, item: Partial<InsertNavigationItem>): Promise<NavigationItem | undefined> {
    const result = await db.update(navigationItems)
      .set(item)
      .where(eq(navigationItems.id, id))
      .returning();
    return result[0];
  }

  async updateNavigationItemsOrder(itemIds: number[]): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < itemIds.length; i++) {
          await tx.update(navigationItems)
            .set({ order: i })
            .where(eq(navigationItems.id, itemIds[i]));
        }
      });
      return true;
    } catch (error) {
      console.error("Error updating navigation item order:", error);
      return false;
    }
  }

  async deleteNavigationItem(id: number): Promise<boolean> {
    const result = await db.delete(navigationItems).where(eq(navigationItems.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Category operations (CMS)
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.order));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.slug, slug));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async updateCategoriesOrder(categoryIds: number[]): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < categoryIds.length; i++) {
          await tx.update(categories)
            .set({ order: i })
            .where(eq(categories.id, categoryIds[i]));
        }
      });
      return true;
    } catch (error) {
      console.error("Error updating category order:", error);
      return false;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Media Library operations (CMS)
  async getMediaItems(): Promise<MediaItem[]> {
    return await db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt));
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const result = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result[0];
  }

  async createMediaItem(media: InsertMediaItem): Promise<MediaItem> {
    const result = await db.insert(mediaLibrary).values(media).returning();
    return result[0];
  }

  async updateMediaItem(id: number, media: Partial<InsertMediaItem>): Promise<MediaItem | undefined> {
    const result = await db.update(mediaLibrary)
      .set(media)
      .where(eq(mediaLibrary.id, id))
      .returning();
    return result[0];
  }

  async deleteMediaItem(id: number): Promise<boolean> {
    const result = await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Site Settings operations
  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings);
  }

  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return result[0];
  }

  async createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    const result = await db.insert(siteSettings).values(setting).returning();
    return result[0];
  }

  async updateSiteSetting(id: number, setting: Partial<InsertSiteSetting>): Promise<SiteSetting | undefined> {
    const result = await db.update(siteSettings)
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

    const result = await db.update(siteSettings)
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
    return await db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName));
  }

  async getDefaultBankAccount(): Promise<BankAccount | undefined> {
    const result = await db.select().from(bankAccounts)
      .where(eq(bankAccounts.isDefault, true))
      .limit(1);

    // If no default bank account exists, get the first bank account
    if (!result.length) {
      const allAccounts = await db.select().from(bankAccounts).limit(1);

      // If we found an account, set it as default and return it
      if (allAccounts.length > 0) {
        const account = allAccounts[0];
        await this.setDefaultBankAccount(account.id);
        return account;
      }

      // If no bank accounts exist at all, create a default one
      if (allAccounts.length === 0) {
        const defaultAccount = await this.createBankAccount({
          bankName: "Хаан Банк",
          accountNumber: "5001122334455",
          accountHolder: "Герийн Мах ХХК",
          description: "Үндсэн данс",
          isDefault: true,
          isActive: true
        });
        return defaultAccount;
      }
    }

    return result[0];
  }

  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    const result = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return result[0];
  }

  async createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount> {
    try {
      console.log("Storage: Creating bank account with data:", JSON.stringify(bankAccount, null, 2));

      // If this is set as default, unset any existing default
      if (bankAccount.isDefault) {
        console.log("Storage: Unsetting existing default bank accounts");
        await db.update(bankAccounts)
          .set({ isDefault: false })
          .where(eq(bankAccounts.isDefault, true));
      }

      console.log("Storage: Inserting new bank account");

      // Ensure all required fields are present and convert types as needed
      const dataToInsert = {
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder,
        description: bankAccount.description === "" ? null : bankAccount.description,
        isDefault: bankAccount.isDefault === true,
        isActive: bankAccount.isActive === undefined ? true : bankAccount.isActive === true,
      };

      console.log("Storage: Prepared data for insertion:", JSON.stringify(dataToInsert, null, 2));

      // Insert the bank account
      const [result] = await db.insert(bankAccounts).values(dataToInsert).returning();

      if (!result) {
        throw new Error("Failed to create bank account");
      }

      console.log("Storage: Bank account created successfully:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("Storage: Error creating bank account:", error);
      if (error instanceof Error) {
        console.error("Storage: Error message:", error.message);
        console.error("Storage: Error stack:", error.stack);
      }
      throw error;
    }
  }

  async updateBankAccount(id: number, bankAccount: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    try {
      console.log("Storage: Updating bank account with ID:", id);
      console.log("Storage: Update data:", JSON.stringify(bankAccount, null, 2));

      // If this is set as default, unset any existing default
      if (bankAccount.isDefault) {
        console.log("Storage: Unsetting existing default bank accounts");
        await db.update(bankAccounts)
          .set({ isDefault: false })
          .where(and(
            eq(bankAccounts.isDefault, true),
            not(eq(bankAccounts.id, id))
          ));
      }

      // Prepare data for update
      const dataToUpdate: Record<string, any> = {};

      if (bankAccount.bankName !== undefined) {
        dataToUpdate.bankName = bankAccount.bankName;
      }

      if (bankAccount.accountNumber !== undefined) {
        dataToUpdate.accountNumber = bankAccount.accountNumber;
      }

      if (bankAccount.accountHolder !== undefined) {
        dataToUpdate.accountHolder = bankAccount.accountHolder;
      }

      if (bankAccount.description !== undefined) {
        dataToUpdate.description = bankAccount.description;
      }

      if (bankAccount.isDefault !== undefined) {
        dataToUpdate.isDefault = bankAccount.isDefault === true;
      }

      if (bankAccount.isActive !== undefined) {
        dataToUpdate.isActive = bankAccount.isActive === true;
      }

      console.log("Storage: Prepared data for update:", JSON.stringify(dataToUpdate, null, 2));

      const result = await db.update(bankAccounts)
        .set(dataToUpdate)
        .where(eq(bankAccounts.id, id))
        .returning();

      console.log("Storage: Bank account updated successfully:", JSON.stringify(result[0], null, 2));
      return result[0];
    } catch (error) {
      console.error("Storage: Error updating bank account:", error);
      if (error instanceof Error) {
        console.error("Storage: Error message:", error.message);
        console.error("Storage: Error stack:", error.stack);
      }
      return undefined;
    }
  }

  async deleteBankAccount(id: number): Promise<boolean> {
    try {
      // Check if this is the default account
      const account = await this.getBankAccount(id);

      if (account && account.isDefault) {
        // Don't delete the default account
        return false;
      }

      const result = await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
      return result.rowCount ? result.rowCount > 0 : true;
    } catch (error) {
      console.error("Error deleting bank account:", error);
      return false;
    }
  }

  async setDefaultBankAccount(id: number): Promise<boolean> {
    try {
      // First, unset any existing default
      await db.update(bankAccounts)
        .set({ isDefault: false })
        .where(eq(bankAccounts.isDefault, true));

      // Then set the new default
      const result = await db.update(bankAccounts)
        .set({ isDefault: true })
        .where(eq(bankAccounts.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error setting default bank account:", error);
      return false;
    }
  }

  // Footer settings methods
  async getFooterSettings(): Promise<FooterSetting | undefined> {
    try {
      // Get the first footer settings record (there should only be one)
      const [footerSetting] = await db
        .select()
        .from(footerSettings)
        .limit(1);

      return footerSetting;
    } catch (error) {
      console.error("Error getting footer settings:", error);
      return undefined;
    }
  }

  async updateFooterSettings(settings: Partial<InsertFooterSetting>): Promise<FooterSetting> {
    try {
      // Check if footer settings already exist
      const existingSettings = await this.getFooterSettings();

      if (!existingSettings) {
        // If no settings exist, create new ones
        const [newSettings] = await db
          .insert(footerSettings)
          .values({
            companyName: settings.companyName || "Герин Мах",
            description: settings.description || "Чанартай махны бүтээгдэхүүн",
            address: settings.address || "Улаанбаатар хот, Монгол улс",
            phone: settings.phone || "976-00-000000",
            email: settings.email || "info@gerinmah.mn",
            copyrightText: settings.copyrightText || `© ${new Date().getFullYear()} Герин Мах. Бүх эрх хуулиар хамгаалагдсан.`,
            logoUrl: settings.logoUrl,
            socialLinks: settings.socialLinks || {},
            quickLinks: settings.quickLinks || []
          })
          .returning();

        return newSettings;
      }

      // Update existing settings
      const [updatedSettings] = await db
        .update(footerSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(footerSettings.id, existingSettings.id))
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error("Error updating footer settings:", error);
      throw new Error("Failed to update footer settings");
    }
  }

  // Meal Kit operations
  async getMealKits(): Promise<MealKit[]> {
    return await db.select().from(mealKits).where(eq(mealKits.isActive, true)).orderBy(asc(mealKits.name));
  }

  async getMealKit(id: number): Promise<(MealKit & { components: (MealKitComponent & { product: Product })[] }) | undefined> {
    const result = await db.select().from(mealKits).where(eq(mealKits.id, id));
    const mealKit = result[0];

    if (!mealKit) {
      return undefined;
    }

    const components = await this.getMealKitComponents(id);

    return {
      ...mealKit,
      components
    };
  }

  async createMealKit(mealKit: InsertMealKit): Promise<MealKit> {
    const result = await db.insert(mealKits).values(mealKit).returning();
    return result[0];
  }

  async updateMealKit(id: number, mealKit: Partial<InsertMealKit>): Promise<MealKit | undefined> {
    const result = await db.update(mealKits)
      .set(mealKit)
      .where(eq(mealKits.id, id))
      .returning();

    return result[0];
  }

  async deleteMealKit(id: number): Promise<boolean> {
    // First delete all components for the meal kit
    await db.delete(mealKitComponents).where(eq(mealKitComponents.mealKitId, id));

    // Then delete the meal kit itself
    const result = await db.delete(mealKits).where(eq(mealKits.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Meal Kit Component operations
  async getMealKitComponents(mealKitId: number): Promise<(MealKitComponent & { product: Product })[]> {
    const components = await db.select()
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
    const result = await db.insert(mealKitComponents).values(component).returning();
    return result[0];
  }

  async updateMealKitComponent(id: number, component: Partial<InsertMealKitComponent>): Promise<MealKitComponent | undefined> {
    const result = await db.update(mealKitComponents)
      .set(component)
      .where(eq(mealKitComponents.id, id))
      .returning();

    return result[0];
  }

  async deleteMealKitComponent(id: number): Promise<boolean> {
    const result = await db.delete(mealKitComponents).where(eq(mealKitComponents.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Generated Meal Kit operations
  async getGeneratedMealKits(userId?: number, sessionId?: string): Promise<GeneratedMealKit[]> {
    if (userId) {
      return await db.select()
        .from(generatedMealKits)
        .where(eq(generatedMealKits.userId, userId))
        .orderBy(desc(generatedMealKits.createdAt));
    } else if (sessionId) {
      return await db.select()
        .from(generatedMealKits)
        .where(eq(generatedMealKits.sessionId, sessionId))
        .orderBy(desc(generatedMealKits.createdAt));
    } else {
      return await db.select()
        .from(generatedMealKits)
        .orderBy(desc(generatedMealKits.createdAt));
    }
  }

  async getGeneratedMealKit(id: number): Promise<(GeneratedMealKit & { components: (GeneratedMealKitComponent & { product: Product })[] }) | undefined> {
    const result = await db.select().from(generatedMealKits).where(eq(generatedMealKits.id, id));
    const mealKit = result[0];

    if (!mealKit) {
      return undefined;
    }

    const components = await this.getGeneratedMealKitComponents(id);

    return {
      ...mealKit,
      components
    };
  }

  async createGeneratedMealKit(mealKit: InsertGeneratedMealKit, components: InsertGeneratedMealKitComponent[]): Promise<GeneratedMealKit> {
    // Begin transaction
    const result = await db.transaction(async (tx) => {
      // Insert meal kit
      const [generatedKit] = await tx.insert(generatedMealKits).values(mealKit).returning();

      // Insert all components
      for (const component of components) {
        await tx.insert(generatedMealKitComponents).values({
          ...component,
          generatedMealKitId: generatedKit.id
        });
      }

      return generatedKit;
    });

    return result;
  }

  async updateGeneratedMealKit(id: number, mealKit: Partial<InsertGeneratedMealKit>): Promise<GeneratedMealKit | undefined> {
    const result = await db.update(generatedMealKits)
      .set(mealKit)
      .where(eq(generatedMealKits.id, id))
      .returning();

    return result[0];
  }

  async deleteGeneratedMealKit(id: number): Promise<boolean> {
    // First delete all components
    await db.delete(generatedMealKitComponents).where(eq(generatedMealKitComponents.generatedMealKitId, id));

    // Then delete the meal kit itself
    const result = await db.delete(generatedMealKits).where(eq(generatedMealKits.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Generated Meal Kit Component operations
  async getGeneratedMealKitComponents(mealKitId: number): Promise<(GeneratedMealKitComponent & { product: Product })[]> {
    const components = await db.select()
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

    // Get all the products
    for (const productId of productIds) {
      const product = await this.getProduct(productId);

      if (product) {
        // Get the quantity (default to 1 if not specified)
        const quantity = quantities[productId] || 1;

        // Calculate the component price
        const price = parseFloat(product.price.toString()) * quantity;
        totalPrice += price;

        // Add to component data
        componentData.push({
          generatedMealKitId: 0, // Will be set during creation
          productId,
          quantity: quantity.toString(),
          price: price.toString()
        });
      }
    }

    // Create the generated meal kit
    const mealKitData: InsertGeneratedMealKit = {
      userId,
      sessionId,
      name,
      totalPrice: totalPrice.toString(),
      isAddedToCart: false
    };

    const mealKit = await this.createGeneratedMealKit(mealKitData, componentData);
    const fullMealKit = await this.getGeneratedMealKit(mealKit.id);

    if (!fullMealKit) {
      throw new Error("Failed to generate meal kit");
    }

    return fullMealKit;
  }

  // Non-delivery day operations
  async getNonDeliveryDays(): Promise<NonDeliveryDay[]> {
    return await db.select().from(nonDeliveryDays).orderBy(asc(nonDeliveryDays.date));
  }

  async getNonDeliveryDay(id: number): Promise<NonDeliveryDay | undefined> {
    const result = await db.select().from(nonDeliveryDays).where(eq(nonDeliveryDays.id, id));
    return result[0];
  }

  async createNonDeliveryDay(day: InsertNonDeliveryDay): Promise<NonDeliveryDay> {
    const result = await db.insert(nonDeliveryDays).values(day).returning();
    return result[0];
  }

  async updateNonDeliveryDay(id: number, day: Partial<InsertNonDeliveryDay>): Promise<NonDeliveryDay | undefined> {
    const result = await db.update(nonDeliveryDays)
      .set(day)
      .where(eq(nonDeliveryDays.id, id))
      .returning();
    return result[0];
  }

  async deleteNonDeliveryDay(id: number): Promise<boolean> {
    const result = await db.delete(nonDeliveryDays).where(eq(nonDeliveryDays.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }

  // Delivery settings operations
  async getDeliverySettings(): Promise<DeliverySetting | undefined> {
    const result = await db.select().from(deliverySettings).limit(1);
    return result[0];
  }

  async updateDeliverySettings(settings: Partial<InsertDeliverySetting>): Promise<DeliverySetting> {
    const existing = await this.getDeliverySettings();

    if (existing) {
      const result = await db.update(deliverySettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(deliverySettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(deliverySettings)
        .values({
          cutoffHour: settings.cutoffHour ?? 18,
          cutoffMinute: settings.cutoffMinute ?? 30,
          processingDays: settings.processingDays ?? 1,
        })
        .returning();
      return result[0];
    }
  }

  // Review operations
  async getReviews(): Promise<Review[]> {
    return await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async getApprovedReviews(): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.isApproved, true))
      .orderBy(desc(reviews.createdAt));
  }

  async getReview(id: number): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    return result[0];
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async updateReview(id: number, review: Partial<InsertReview & { isApproved: boolean }>): Promise<Review | undefined> {
    const result = await db.update(reviews)
      .set(review)
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return result.rowCount ? result.rowCount > 0 : true;
  }
}

export const storage = new DatabaseStorage();
