INSERT INTO site_settings (key, value) VALUES ('site_name', 'Meatmall') ON CONFLICT(key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('shipping_fee', '[{"min":0,"max":999999999,"fee":6000}]') ON CONFLICT(key) DO NOTHING;
CREATE TRIGGER products_stock_nonnegative BEFORE UPDATE OF stock ON products
WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT, 'Insufficient stock'); END;
