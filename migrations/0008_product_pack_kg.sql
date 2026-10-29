-- Products sold only in fixed-weight packs (e.g. 4 = a 4kg box; the price is per pack).
-- Nullable: products saved before this keep the old rule (lamb leg = 4kg pack, others by the kg).
ALTER TABLE `products` ADD COLUMN `pack_kg` integer;
-- Pack size at the time of the order, so later product edits never change past order totals.
ALTER TABLE `order_items` ADD COLUMN `pack_kg` integer;
