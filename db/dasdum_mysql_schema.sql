-- DASDUM — MySQL schema for cPanel hosting.
--
-- How to use this on Namecheap cPanel:
--   1. cPanel → "MySQL Database Wizard" → create a database (e.g. `dasdum`)
--      and a database user, and add that user to the database with ALL
--      PRIVILEGES. cPanel will prefix both with your cPanel username, e.g.
--      `cpaneluser_dasdum` / `cpaneluser_shop` — that full prefixed name is
--      what you put in DB_NAME / DB_USER in your .env.
--   2. cPanel → "phpMyAdmin" → select that database → "Import" tab →
--      choose this file → Go.
--   3. That's it — no shell/SSH access required for this step.
--
-- This mirrors src/lib/db/schema.ts (Drizzle is the source of truth for
-- TypeScript typing; this file is what actually gets run against MySQL).
-- If you later change schema.ts, regenerate the equivalent SQL by hand or
-- with `npm run db:generate` (needs `npm install` locally) and apply the
-- diff the same way.

CREATE TABLE `customer` (
  `id` varchar(36) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` text NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `is_disabled` boolean NOT NULL DEFAULT false,
  `created_at` varchar(32) NOT NULL,
  `updated_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `admin_user` (
  `id` varchar(36) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` text NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(32) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `address` (
  `id` varchar(36) NOT NULL,
  `customer_id` varchar(36) NOT NULL,
  `label` varchar(64) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `line1` varchar(255) NOT NULL,
  `line2` varchar(255) DEFAULT NULL,
  `city` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `postal_code` varchar(32) DEFAULT NULL,
  `country` varchar(2) NOT NULL DEFAULT 'GB',
  `phone` varchar(64) DEFAULT NULL,
  `is_default` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  KEY `address_customer_id_idx` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `category` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text,
  `image_media_id` varchar(36) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `seo_title` varchar(255) DEFAULT NULL,
  `seo_description` text,
  `parent_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text,
  `short_description` text,
  `price` int NOT NULL,
  `sale_price` int DEFAULT NULL,
  `sku` varchar(191) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `category_id` varchar(36) DEFAULT NULL,
  `tags` text,
  `featured_image_media_id` varchar(36) DEFAULT NULL,
  `weight_grams` int DEFAULT NULL,
  `length_mm` int DEFAULT NULL,
  `width_mm` int DEFAULT NULL,
  `height_mm` int DEFAULT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `seo_description` text,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `created_at` varchar(32) NOT NULL,
  `updated_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_slug_unique` (`slug`),
  UNIQUE KEY `product_sku_unique` (`sku`),
  KEY `product_category_id_idx` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order` (
  `id` varchar(36) NOT NULL,
  `order_number` varchar(64) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `shipping_address_id` varchar(36) DEFAULT NULL,
  `subtotal` int NOT NULL,
  `discount_total` int NOT NULL DEFAULT 0,
  `shipping_total` int NOT NULL DEFAULT 0,
  `tax_total` int NOT NULL DEFAULT 0,
  `grand_total` int NOT NULL,
  `coupon_id` varchar(36) DEFAULT NULL,
  `payment_status` varchar(16) NOT NULL DEFAULT 'pending',
  `fulfillment_status` varchar(16) NOT NULL DEFAULT 'pending',
  `stripe_session_id` varchar(191) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(191) DEFAULT NULL,
  `customer_email` varchar(191) DEFAULT NULL,
  `shipping_address` text,
  `delivery_method` varchar(16) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  `updated_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_order_number_unique` (`order_number`),
  KEY `order_customer_id_idx` (`customer_id`),
  KEY `order_payment_intent_idx` (`stripe_payment_intent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_item` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `variant_id` varchar(36) DEFAULT NULL,
  `product_name_snapshot` varchar(255) NOT NULL,
  `unit_price` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_item_order_id_idx` (`order_id`),
  KEY `order_item_product_id_idx` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `wishlist_item` (
  `id` varchar(36) NOT NULL,
  `customer_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `wishlist_item_customer_id_idx` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `audit_log` (
  `id` varchar(36) NOT NULL,
  `admin_user_id` varchar(36) DEFAULT NULL,
  `action` varchar(191) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(36) DEFAULT NULL,
  `metadata` text,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `media` (
  `id` varchar(36) NOT NULL,
  `storage_key` varchar(191) NOT NULL,
  `url` text NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size_bytes` int NOT NULL,
  `uploaded_by` varchar(36) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `media_storage_key_unique` (`storage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `site_setting` (
  `key` varchar(191) NOT NULL,
  `value` text NOT NULL,
  `updated_at` varchar(32) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_image` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `media_id` varchar(36) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `product_image_product_id_idx` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `blog_category` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blog_category_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `blog_post` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `excerpt` text,
  `content` text,
  `cover_media_id` varchar(36) DEFAULT NULL,
  `author_admin_id` varchar(36) DEFAULT NULL,
  `blog_category_id` varchar(36) DEFAULT NULL,
  `tags` text,
  `seo_title` varchar(255) DEFAULT NULL,
  `seo_description` text,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `published_at` varchar(32) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blog_post_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
