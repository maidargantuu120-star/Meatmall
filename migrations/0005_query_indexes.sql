-- Additive lookup indexes only: no rows, roles, receipts or totals are changed.
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id, id DESC);
CREATE INDEX IF NOT EXISTS orders_status_id_idx ON orders(status, id DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at, id DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS media_library_url_idx ON media_library(url);
