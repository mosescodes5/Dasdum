export type DemoProduct = {
  id: string;
  slug: string;
  name: string;
  price: number; // minor units (pence)
  salePrice?: number;
  badge?: string;
  rating: number;
  reviewCount: number;
  categorySlug: string;
  inStock: boolean;
  shortDescription: string;
  description: string;
  variants: { name: string; options: string[] }[];
  /** Always undefined for demo items — present so demo/real product
   * objects share a shape wherever a page might render either. */
  imageUrl?: string;
};

export type DemoCategory = {
  slug: string;
  name: string;
  description: string;
};

export const CATEGORIES: DemoCategory[] = [
  { slug: "home-living", name: "Home & Living", description: "Ceramics, textiles, and objects for everyday rituals." },
  { slug: "bags-travel", name: "Bags & Travel", description: "Structured leather and canvas built to be used." },
  { slug: "apparel", name: "Apparel", description: "Considered basics in natural fibers." },
];

export const PRODUCTS: DemoProduct[] = [
  {
    id: "1", slug: "adire-stoneware-set", name: "Adire Stoneware Set (4pc)",
    price: 8500, badge: "New", rating: 4.8, reviewCount: 62,
    categorySlug: "home-living", inStock: true,
    shortDescription: "Hand-glazed stoneware dinner set inspired by adire resist-dye patterns.",
    description:
      "Each piece in this four-setting stoneware collection is thrown and glazed by a small studio in Abeokuta, drawing on the resist-dye motifs of traditional adire cloth. The matte glaze is food-safe, dishwasher-safe, and deepens in character with use. Includes 4 dinner plates, 4 side plates, and 4 stoneware mugs.",
    variants: [{ name: "Glaze", options: ["Indigo", "Terracotta", "Charcoal"] }],
  },
  {
    id: "2", slug: "osun-weekender-bag", name: "Osun Leather Weekender",
    price: 22000, salePrice: 18500, rating: 4.9, reviewCount: 41,
    categorySlug: "bags-travel", inStock: true,
    shortDescription: "Full-grain leather weekender with brass hardware and a detachable strap.",
    description:
      "Built from full-grain leather that's chosen to develop a deep patina over years of use, the Osun Weekender fits an overnight trip without feeling bulky. Solid brass hardware, a cotton canvas lining, and reinforced stitching at every stress point mean this is designed to be your only bag, not a seasonal one.",
    variants: [{ name: "Color", options: ["Cognac", "Deep Teal", "Black"] }],
  },
  {
    id: "3", slug: "iroko-side-table", name: "Iroko Wood Side Table",
    price: 16500, rating: 4.7, reviewCount: 28,
    categorySlug: "home-living", inStock: true,
    shortDescription: "Solid iroko hardwood side table with a hand-oiled finish.",
    description:
      "Iroko is prized for its durability and rich grain — this side table is solid wood throughout, not veneer, and finished with a hand-rubbed oil that can be refreshed for decades of use. Each table carries slightly different grain patterning, so no two are identical.",
    variants: [],
  },
  {
    id: "4", slug: "harmattan-throw", name: "Harmattan Cotton Throw",
    price: 5800, rating: 4.6, reviewCount: 54, badge: "Bestseller",
    categorySlug: "home-living", inStock: true,
    shortDescription: "Heavyweight woven cotton throw for cooler evenings.",
    description:
      "Woven on traditional looms in a heavyweight cotton that holds its shape wash after wash. Named for the dry, dusty winds of the Harmattan season this throw is designed to answer, it's substantial enough to double as a light blanket.",
    variants: [{ name: "Color", options: ["Ochre", "Deep Teal", "Natural"] }],
  },
  {
    id: "5", slug: "lagos-market-tote", name: "Lagos Market Tote",
    price: 4200, rating: 4.8, reviewCount: 103, badge: "Bestseller",
    categorySlug: "bags-travel", inStock: true,
    shortDescription: "Durable canvas tote built for daily carry.",
    description:
      "Modeled on the structured market totes carried across Lagos for decades, this canvas bag is reinforced at the base and handles to carry real weight — groceries, laptops, or a full day's errands — without stretching out of shape.",
    variants: [{ name: "Size", options: ["Standard", "Large"] }],
  },
  {
    id: "6", slug: "savanna-linen-shirt", name: "Savanna Linen Shirt",
    price: 6800, rating: 4.5, reviewCount: 37,
    categorySlug: "apparel", inStock: false,
    shortDescription: "Breathable 100% linen shirt, relaxed fit.",
    description:
      "Cut for warm climates in a mid-weight European linen that softens with every wash. A relaxed, unstructured fit through the body with a slightly dropped shoulder, designed to be worn open over a tee or buttoned on its own.",
    variants: [{ name: "Size", options: ["S", "M", "L", "XL"] }],
  },
  {
    id: "7", slug: "calabash-pendant-light", name: "Calabash Pendant Light",
    price: 9800, rating: 4.9, reviewCount: 19,
    categorySlug: "home-living", inStock: true,
    shortDescription: "Hand-carved calabash gourd pendant light shade.",
    description:
      "Each shade is carved from a dried calabash gourd, so the perforation pattern that lets light through is unique to that piece. Wired for standard E27 fittings and supplied with 2m of fabric-braided flex.",
    variants: [],
  },
  {
    id: "8", slug: "nomad-crossbody", name: "Nomad Leather Crossbody",
    price: 7800, rating: 4.7, reviewCount: 45,
    categorySlug: "bags-travel", inStock: true,
    shortDescription: "Compact crossbody in vegetable-tanned leather.",
    description:
      "A pared-back crossbody sized for a phone, cards, and keys — nothing more. Vegetable-tanned leather means no heavy metal tanning agents and a finish that ages into a warm honey tone.",
    variants: [{ name: "Color", options: ["Cognac", "Black"] }],
  },
];
