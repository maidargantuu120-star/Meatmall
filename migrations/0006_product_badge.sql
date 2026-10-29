-- Short admin-written label shown on the product card photo (e.g. "Шинэ", "Хямдрал").
-- Nullable: existing products show no badge until one is entered.
ALTER TABLE `products` ADD COLUMN `badge` text;
