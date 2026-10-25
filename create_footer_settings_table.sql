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
  updated_at TIMESTAMP DEFAULT NOW()
);