import { mysqlTable, varchar, text, int, boolean } from "drizzle-orm/mysql-core";

// Mirrors db/schema.sql (MySQL DDL, applied via phpMyAdmin or drizzle-kit
// push against your cPanel MySQL database). Kept as the single source of
// truth for TypeScript query typing.
//
// Timestamp columns are stored as ISO-8601 strings in VARCHAR rather than
// a native DATETIME type — the app already writes `new Date().toISOString()`
// everywhere, so this keeps serialization identical to how it worked before
// and avoids timezone-conversion surprises from MySQL's DATETIME/TIMESTAMP.
//
// Primary/foreign key id columns are VARCHAR(36) (a UUID's exact length,
// from crypto.randomUUID()) rather than TEXT — MySQL can't put a plain TEXT
// column in a PRIMARY KEY or UNIQUE index without an explicit prefix length.
//
// Other unique/indexed string columns (email, slug, sku, etc.) are
// VARCHAR(191) rather than VARCHAR(255) — with the utf8mb4 charset, 191
// chars is the longest a MySQL/MariaDB unique index key can be under the
// classic 767-byte prefix limit some older cPanel-provisioned databases
// still use. 191 is safe everywhere; 255 might not be, depending on the
// server.

const id = () => varchar("id", { length: 36 }).primaryKey();
const foreignId = (name: string) => varchar(name, { length: 36 });
const timestamp = (name: string) => varchar(name, { length: 32 });
const slug = (name: string) => varchar(name, { length: 191 });

export const customer = mysqlTable("customer", {
  id: id(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  isDisabled: boolean("is_disabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const adminUser = mysqlTable("admin_user", {
  id: id(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 32, enum: ["super_admin", "manager", "editor", "support"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
});

export const address = mysqlTable("address", {
  id: id(),
  customerId: foreignId("customer_id").notNull(),
  label: varchar("label", { length: 64 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 191 }).notNull(),
  state: varchar("state", { length: 191 }).notNull(),
  postalCode: varchar("postal_code", { length: 32 }),
  country: varchar("country", { length: 2 }).notNull().default("GB"),
  phone: varchar("phone", { length: 64 }),
  isDefault: boolean("is_default").notNull().default(false),
});

export const category = mysqlTable("category", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: slug("slug").notNull().unique(),
  description: text("description"),
  imageMediaId: foreignId("image_media_id"),
  sortOrder: int("sort_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  parentId: foreignId("parent_id"),
});

export const product = mysqlTable("product", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: slug("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  price: int("price").notNull(),
  salePrice: int("sale_price"),
  sku: varchar("sku", { length: 191 }).notNull().unique(),
  stock: int("stock").notNull().default(0),
  categoryId: foreignId("category_id"),
  tags: text("tags"), // JSON array
  featuredImageMediaId: foreignId("featured_image_media_id"),
  weightGrams: int("weight_grams"),
  lengthMm: int("length_mm"),
  widthMm: int("width_mm"),
  heightMm: int("height_mm"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  status: varchar("status", { length: 16, enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const order = mysqlTable("order", {
  id: id(),
  orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
  customerId: foreignId("customer_id"),
  shippingAddressId: foreignId("shipping_address_id"),
  subtotal: int("subtotal").notNull(),
  discountTotal: int("discount_total").notNull().default(0),
  shippingTotal: int("shipping_total").notNull().default(0),
  taxTotal: int("tax_total").notNull().default(0),
  grandTotal: int("grand_total").notNull(),
  couponId: foreignId("coupon_id"),
  paymentStatus: varchar("payment_status", { length: 16, enum: ["pending", "paid", "failed", "refunded"] })
    .notNull()
    .default("pending"),
  fulfillmentStatus: varchar("fulfillment_status", {
    length: 16,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
  })
    .notNull()
    .default("pending"),
  stripeSessionId: varchar("stripe_session_id", { length: 191 }),
  // Saved when payment completes so a refund made in the Stripe dashboard
  // (charge.refunded webhook) can be matched back to this order.
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 191 }),
  // Guest checkout: no customer/address row required, so the contact and
  // shipping details are stored on the order itself (address as JSON).
  customerEmail: varchar("customer_email", { length: 191 }),
  shippingAddress: text("shipping_address"), // JSON
  deliveryMethod: varchar("delivery_method", { length: 16 }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const orderItem = mysqlTable("order_item", {
  id: id(),
  orderId: foreignId("order_id").notNull(),
  productId: foreignId("product_id").notNull(),
  variantId: foreignId("variant_id"),
  productNameSnapshot: varchar("product_name_snapshot", { length: 255 }).notNull(),
  unitPrice: int("unit_price").notNull(),
  quantity: int("quantity").notNull(),
});

export const wishlistItem = mysqlTable("wishlist_item", {
  id: id(),
  customerId: foreignId("customer_id").notNull(),
  productId: foreignId("product_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const auditLog = mysqlTable("audit_log", {
  id: id(),
  adminUserId: foreignId("admin_user_id"),
  action: varchar("action", { length: 191 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: foreignId("entity_id"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").notNull(),
});

// Small key-value store for admin-editable site content that isn't a
// product/category/post — currently just the homepage hero. One row per
// key, value is a JSON string. Deliberately not a kitchen-sink "site
// settings" table: add a new key only when something concrete needs to
// be editable from /admin, not speculatively.
export const siteSetting = mysqlTable("site_setting", {
  key: varchar("key", { length: 191 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
});

// A product's extra gallery photos (beyond its single featuredImageMediaId
// on `product`, which is what shows in listing/card thumbnails). Ordered
// by sortOrder for the product detail page's image gallery.
export const productImage = mysqlTable("product_image", {
  id: id(),
  productId: foreignId("product_id").notNull(),
  mediaId: foreignId("media_id").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const media = mysqlTable("media", {
  id: id(),
  storageKey: varchar("storage_key", { length: 191 }).notNull().unique(),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  uploadedBy: foreignId("uploaded_by"),
  createdAt: timestamp("created_at").notNull(),
});

export const blogCategory = mysqlTable("blog_category", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: slug("slug").notNull().unique(),
});

export const blogPost = mysqlTable("blog_post", {
  id: id(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: slug("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  coverMediaId: foreignId("cover_media_id"),
  authorAdminId: foreignId("author_admin_id"),
  blogCategoryId: foreignId("blog_category_id"),
  tags: text("tags"), // JSON array
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  status: varchar("status", { length: 16, enum: ["draft", "published"] }).notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull(),
});
