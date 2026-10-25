-- Supabase PostgreSQL Schema for Elbeg Meat Shop
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_ru TEXT,
  name_en TEXT,
  description TEXT NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_order_quantity DECIMAL(10,2) DEFAULT 1,
  store_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  google_id TEXT UNIQUE,
  profile_image_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Footer settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  social_links JSONB DEFAULT '{}',
  copyright_text TEXT NOT NULL,
  quick_links JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  opening_hours JSONB DEFAULT '{}',
  category_id INTEGER NOT NULL REFERENCES service_categories(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Reviews are viewable if approved" ON reviews;
CREATE POLICY "Reviews are viewable if approved" ON reviews FOR SELECT USING (is_approved = true);

-- Users policies (Required for registration and login)
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON users;
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);

-- Orders policies (Required for checkout)
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON orders;
CREATE POLICY "Enable insert for all users" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON orders;
CREATE POLICY "Enable update for all users" ON orders FOR UPDATE USING (true);

-- Create admin user
INSERT INTO users (username, password, email, name, is_admin) 
VALUES ('admin', '$2b$10$xxxxxxxxxxxxxxxxxxx', 'admin@elbeg.com', 'Admin', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug, description, "order") VALUES
  ('소고기', 'beef', '신선한 소고기', 1),
  ('돼지고기', 'pork', '신선한 돼지고기', 2),
  ('양고기', 'lamb', '신선한 양고기', 3),
  ('닭고기', 'chicken', '신선한 닭고기', 4)
ON CONFLICT (slug) DO NOTHING;

-- Missing Tables

-- Non-delivery days
CREATE TABLE IF NOT EXISTS non_delivery_days (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  is_recurring_yearly BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery settings
CREATE TABLE IF NOT EXISTS delivery_settings (
  id SERIAL PRIMARY KEY,
  cutoff_hour INTEGER NOT NULL DEFAULT 18,
  cutoff_minute INTEGER NOT NULL DEFAULT 30,
  processing_days INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize delivery settings
INSERT INTO delivery_settings (id, cutoff_hour, cutoff_minute, processing_days)
VALUES (1, 18, 30, 1)
ON CONFLICT (id) DO NOTHING;

-- Site content
CREATE TABLE IF NOT EXISTS site_content (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Navigation items
CREATE TABLE IF NOT EXISTS navigation_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal kits
CREATE TABLE IF NOT EXISTS meal_kits (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cooking_time INTEGER NOT NULL DEFAULT 30,
  servings INTEGER NOT NULL DEFAULT 2,
  difficulty_level TEXT NOT NULL DEFAULT 'easy',
  instructions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal kit components
CREATE TABLE IF NOT EXISTS meal_kit_components (
  id SERIAL PRIMARY KEY,
  meal_kit_id INTEGER NOT NULL REFERENCES meal_kits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'grams',
  is_optional BOOLEAN NOT NULL DEFAULT FALSE
);

-- Generated meal kits
CREATE TABLE IF NOT EXISTS generated_meal_kits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  is_added_to_cart BOOLEAN NOT NULL DEFAULT FALSE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated meal kit components
CREATE TABLE IF NOT EXISTS generated_meal_kit_components (
  id SERIAL PRIMARY KEY,
  generated_meal_kit_id INTEGER NOT NULL REFERENCES generated_meal_kits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- Media library
CREATE TABLE IF NOT EXISTS media_library (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE non_delivery_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_meal_kits ENABLE ROW LEVEL SECURITY;

-- Public read policies for new tables
DROP POLICY IF EXISTS "Public can read non_delivery_days" ON non_delivery_days;
CREATE POLICY "Public can read non_delivery_days" ON non_delivery_days FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read delivery_settings" ON delivery_settings;
CREATE POLICY "Public can read delivery_settings" ON delivery_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read site_content" ON site_content;
CREATE POLICY "Public can read site_content" ON site_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read navigation_items" ON navigation_items;
CREATE POLICY "Public can read navigation_items" ON navigation_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read meal_kits" ON meal_kits;
CREATE POLICY "Public can read meal_kits" ON meal_kits FOR SELECT USING (true);

-- Generated meal kits policies
DROP POLICY IF EXISTS "Users can create generated_meal_kits" ON generated_meal_kits;
CREATE POLICY "Users can create generated_meal_kits" ON generated_meal_kits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read own generated_meal_kits" ON generated_meal_kits;
CREATE POLICY "Users can read own generated_meal_kits" ON generated_meal_kits FOR SELECT USING (true); -- Simplified for now
DROP POLICY IF EXISTS "Users can update own generated_meal_kits" ON generated_meal_kits;
CREATE POLICY "Users can update own generated_meal_kits" ON generated_meal_kits FOR UPDATE USING (true);

-- Generated meal kit components policies
ALTER TABLE generated_meal_kit_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert components" ON generated_meal_kit_components;
CREATE POLICY "Users can insert components" ON generated_meal_kit_components FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read components" ON generated_meal_kit_components;
CREATE POLICY "Users can read components" ON generated_meal_kit_components FOR SELECT USING (true);


-- Insert default site settings (Fixing 406 error for site_name)
INSERT INTO site_settings (key, value, description)
VALUES ('site_name', 'Элбэг мах хүнс', 'Site Name')
ON CONFLICT (key) DO NOTHING;

-- Insert default footer settings
INSERT INTO footer_settings (company_name, description, address, phone, email, copyright_text)
VALUES (
  'Элбэг мах хүнс',
  'Чанартай махны бүтээгдэхүүн',
  '대전광역시 동구 계족로 489번길 상가동 112호 용전동 한숲아파트',
  '010 5940 0081',
  'elbegmeat@example.com',
  '© 2025 Элбэг мах хүнс. Бүх эрх хуулиар хамгаалагдсан.'
)
ON CONFLICT DO NOTHING;

-- Insert default hero content
INSERT INTO site_content (key, title, content, image_url)
VALUES (
  'hero',
  'Элбэг мах хүнс',
  'Амт чанар болон найдвартай үйлчилгээ нэг дор',
  'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=2000&auto=format&fit=crop'
)
ON CONFLICT (key) DO NOTHING;

-- Ensure RLS is enabled and policies exist for footer_settings
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read footer_settings" ON footer_settings;
CREATE POLICY "Public can read footer_settings" ON footer_settings FOR SELECT USING (true);

-- Ensure RLS is enabled and policies exist for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read site_settings" ON site_settings;
CREATE POLICY "Public can read site_settings" ON site_settings FOR SELECT USING (true);

