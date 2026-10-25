import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Helper for boolean
const boolean = (name: string) => integer(name, { mode: "boolean" });
// Helper for timestamp
const timestamp = (name: string) => integer(name, { mode: "timestamp" });

// Products table with multilingual support
export const products = sqliteTable("products", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // Default Mongolian name
  nameRu: text("name_ru"), // Russian name
  nameEn: text("name_en"), // English name
  description: text("description").notNull(), // Default Mongolian description
  descriptionRu: text("description_ru"), // Russian description
  descriptionEn: text("description_en"), // English description
  category: text("category").notNull(),
  price: real("price").notNull(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // Added thumbnail URL for optimization
  stock: integer("stock").notNull().default(0),
  minOrderQuantity: real("min_order_quantity").default(1), // Minimum order quantity in kg
  storeId: integer("store_id"), // Added store ID reference
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true
});

// Orders table
export const orders = sqliteTable("orders", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"), // Optional: can be null for guest checkout
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  paymentMethod: text("payment_method").notNull().default("bank_transfer"),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  status: true,
  createdAt: true
});

// Order items table
export const orderItems = sqliteTable("order_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true
});

// Users table (both admin and customers)
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"), // Made name optional
  phone: text("phone"),
  googleId: text("google_id").unique(), // Google OAuth ID
  profileImageUrl: text("profile_image_url"), // Profile image from Google
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
  createdAt: true
});

// Add login validation schema
export const loginSchema = z.object({
  username: z.string().min(3, { message: "Хэрэглэгчийн нэр дор хаяж 3 тэмдэгт байх ёстой" }),
  password: z.string().min(6, { message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой" }),
});

// Add password validation to signup schema with required email validation
export const signupSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой" }),
  confirmPassword: z.string(),
  email: z.string()
    .min(1, { message: "Имэйл хаяг заавал байх ёстой" })
    .email({ message: "Имэйл хаяг буруу байна" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Нууц үг таарахгүй байна",
  path: ["confirmPassword"],
});

// Site content table
export const siteContent = sqliteTable("site_content", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // e.g., 'home_hero', 'about_section'
  title: text("title").notNull(),
  content: text("content").notNull(),  // HTML content
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bank account information
export const bankAccounts = sqliteTable("bank_accounts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSiteContentSchema = createInsertSchema(siteContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
}).required({
  bankName: true,
  accountNumber: true,
  accountHolder: true,
}).transform((data) => {
  return {
    ...data,
    // Ensure empty strings are stored as null
    description: data.description === "" ? null : data.description,
    // Ensure boolean values are stored correctly
    isDefault: data.isDefault === true,
    isActive: data.isActive === undefined ? true : data.isActive === true,
  };
});

// Navigation menu items
export const navigationItems = sqliteTable("navigation_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNavigationItemSchema = createInsertSchema(navigationItems).omit({
  id: true,
  createdAt: true,
});

// Categories management
export const categories = sqliteTable("categories", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// Media library
export const mediaLibrary = sqliteTable("media_library", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // image, document, etc.
  url: text("url").notNull(),
  size: integer("size"), // bytes
  metadata: text("metadata", { mode: "json" }), // dimensions, alt text, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaSchema = createInsertSchema(mediaLibrary).omit({
  id: true,
  createdAt: true,
});

// Footer settings
export const footerSettings = sqliteTable("footer_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  logoUrl: text("logo_url"),
  socialLinks: text("social_links", { mode: "json" }).default("{}"), // Facebook, Twitter, Instagram, etc. URLs
  copyrightText: text("copyright_text").notNull(),
  quickLinks: text("quick_links", { mode: "json" }).default("[]"), // Array of { title, url } objects
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFooterSettingsSchema = createInsertSchema(footerSettings).omit({
  id: true,
  updatedAt: true,
});

// Site settings for configuration values
export const siteSettings = sqliteTable("site_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // e.g., 'shipping_fee', 'currency_symbol'
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

// Meal kits table
export const mealKits = sqliteTable("meal_kits", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  price: real("price").notNull(),
  cookingTime: integer("cooking_time").notNull().default(30), // in minutes
  servings: integer("servings").notNull().default(2),
  difficultyLevel: text("difficulty_level", { length: 20 }).notNull().default("easy"),
  instructions: text("instructions").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMealKitSchema = createInsertSchema(mealKits).omit({
  id: true,
  createdAt: true
});

// Meal kit components (products that are part of a meal kit)
export const mealKitComponents = sqliteTable("meal_kit_components", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  mealKitId: integer("meal_kit_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit", { length: 20 }).notNull().default("grams"),
  isOptional: boolean("is_optional").notNull().default(false),
});

export const insertMealKitComponentSchema = createInsertSchema(mealKitComponents).omit({
  id: true
});

// Generated meal kits (custom kits created by users)
export const generatedMealKits = sqliteTable("generated_meal_kits", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id"), // Can be null for non-logged-in users
  name: text("name").notNull(),
  totalPrice: real("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isAddedToCart: boolean("is_added_to_cart").notNull().default(false),
  sessionId: text("session_id"), // To track anonymous users
});

export const insertGeneratedMealKitSchema = createInsertSchema(generatedMealKits).omit({
  id: true,
  createdAt: true
});

// Generated meal kit components
export const generatedMealKitComponents = sqliteTable("generated_meal_kit_components", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  generatedMealKitId: integer("generated_meal_kit_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
});

export const insertGeneratedMealKitComponentSchema = createInsertSchema(generatedMealKitComponents).omit({
  id: true
});

// Cart type (not in DB, used for client-side state)
export const cartItemSchema = z.object({
  productId: z.number(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  imageUrl: z.string(),
});

// Define relations for the database

// Define relations between orders and users
export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

// Define relations between users and orders
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

// Define relations between orders and orderItems
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Define relations between meal kits and their components
export const mealKitComponentsRelations = relations(mealKitComponents, ({ one }) => ({
  mealKit: one(mealKits, {
    fields: [mealKitComponents.mealKitId],
    references: [mealKits.id],
  }),
  product: one(products, {
    fields: [mealKitComponents.productId],
    references: [products.id],
  }),
}));

// Define relations between meal kits and their components (reverse)
export const mealKitsRelations = relations(mealKits, ({ many }) => ({
  components: many(mealKitComponents),
}));

// Define relations for generated meal kits
export const generatedMealKitComponentsRelations = relations(generatedMealKitComponents, ({ one }) => ({
  generatedMealKit: one(generatedMealKits, {
    fields: [generatedMealKitComponents.generatedMealKitId],
    references: [generatedMealKits.id],
  }),
  product: one(products, {
    fields: [generatedMealKitComponents.productId],
    references: [products.id],
  }),
}));

// Define relations for generated meal kits (reverse)
export const generatedMealKitsRelations = relations(generatedMealKits, ({ many, one }) => ({
  components: many(generatedMealKitComponents),
  user: one(users, {
    fields: [generatedMealKits.userId],
    references: [users.id],
  }),
}));

// Export types
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type User = typeof users.$inferSelect;
export type UserWithNullablePhone = Omit<User, 'phone' | 'name'> & {
  phone: string | null;
  name: string | null;
};
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type NavigationItem = typeof navigationItems.$inferSelect;
export type InsertNavigationItem = z.infer<typeof insertNavigationItemSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MediaItem = typeof mediaLibrary.$inferSelect;
export type InsertMediaItem = z.infer<typeof insertMediaSchema>;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingsSchema>;

export type FooterSetting = typeof footerSettings.$inferSelect;
export type InsertFooterSetting = z.infer<typeof insertFooterSettingsSchema>;

export type MealKit = typeof mealKits.$inferSelect;
export type InsertMealKit = z.infer<typeof insertMealKitSchema>;

export type MealKitComponent = typeof mealKitComponents.$inferSelect;
export type InsertMealKitComponent = z.infer<typeof insertMealKitComponentSchema>;

export type GeneratedMealKit = typeof generatedMealKits.$inferSelect;
export type InsertGeneratedMealKit = z.infer<typeof insertGeneratedMealKitSchema>;

export type GeneratedMealKitComponent = typeof generatedMealKitComponents.$inferSelect;
export type InsertGeneratedMealKitComponent = z.infer<typeof insertGeneratedMealKitComponentSchema>;

export type CartItem = z.infer<typeof cartItemSchema>;

// Stores (businesses) table
export const stores = sqliteTable("stores", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  openingHours: text("opening_hours", { mode: "json" }).default("{}"),
  categoryId: integer("category_id").notNull(), // References a service category (meat store, restaurant, etc)
  userId: integer("user_id").notNull(), // Store owner/admin user
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  isVerified: true,
});

// Service Categories table (for the 12 main categories shown as icons)
export const serviceCategories = sqliteTable("service_categories", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(), // Material icon name
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
  createdAt: true,
});

// Define relations
export const storesRelations = relations(stores, ({ one, many }) => ({
  serviceCategory: one(serviceCategories, {
    fields: [stores.categoryId],
    references: [serviceCategories.id],
  }),
  owner: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  products: many(products),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  stores: many(stores),
}));

// Add relations from products table to stores
export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
}));

// Export types
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;

// Non-delivery days (holidays, special days when delivery is not available)
export const nonDeliveryDays = sqliteTable("non_delivery_days", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  date: timestamp("date").notNull(),
  reason: text("reason").notNull(), // e.g., "공휴일", "설날", "추석"
  isRecurringYearly: boolean("is_recurring_yearly").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNonDeliveryDaySchema = createInsertSchema(nonDeliveryDays).omit({
  id: true,
  createdAt: true,
});

// Delivery settings (cutoff time, etc.)
export const deliverySettings = sqliteTable("delivery_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  cutoffHour: integer("cutoff_hour").notNull().default(18), // 18:00
  cutoffMinute: integer("cutoff_minute").notNull().default(30), // 18:30
  processingDays: integer("processing_days").notNull().default(1), // Next day delivery
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeliverySettingsSchema = createInsertSchema(deliverySettings).omit({
  id: true,
  updatedAt: true,
});

export type NonDeliveryDay = typeof nonDeliveryDays.$inferSelect;
export type InsertNonDeliveryDay = z.infer<typeof insertNonDeliveryDaySchema>;

export type DeliverySetting = typeof deliverySettings.$inferSelect;
export type InsertDeliverySetting = z.infer<typeof insertDeliverySettingsSchema>;

// Customer reviews
export const reviews = sqliteTable("reviews", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull().default(5), // 1-5 stars
  content: text("content").notNull(),
  isApproved: boolean("is_approved").notNull().default(false), // Admin approval required
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  isApproved: true,
  createdAt: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
