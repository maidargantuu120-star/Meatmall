-- Extra product photos (JSON array of URLs) shown after the main `image_url` on the product page.
-- Nullable: existing products keep their single photo.
ALTER TABLE `products` ADD COLUMN `gallery_images` text;
