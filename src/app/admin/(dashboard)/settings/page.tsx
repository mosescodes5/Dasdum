"use client";

import { useEffect, useState } from "react";
import { DropzoneUpload } from "@/components/admin/DropzoneUpload";
import type { HeroContentValues } from "@/lib/validation/admin-hero";

const EMPTY_HERO: HeroContentValues = {
  heading: "",
  subheading: "",
  primaryCta: { label: "", href: "" },
  secondaryCta: { label: "", href: "" },
  imageUrl: null,
};

type CategoryImage = { id: string; name: string; imageUrl: string | null };

// This whole page is reachable by URL to anyone with an admin session —
// the sidebar link is hidden from non-developer admins (see AdminSidebar),
// but that's a UI convenience, not the security boundary. Every API route
// this page calls independently checks requireDeveloper() and returns 403
// to anyone else, which is what actually enforces the restriction; the
// "Not authorized" states below just mean that 403 came back.
export default function AdminSettingsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [hero, setHero] = useState<HeroContentValues | null>(null);
  const [brandStoryImageUrl, setBrandStoryImageUrl] = useState<string | null | undefined>(undefined);
  const [categories, setCategories] = useState<CategoryImage[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings/hero"),
      fetch("/api/admin/settings/brand-story"),
      fetch("/api/admin/settings/category-images"),
    ]).then(async ([heroRes, storyRes, catRes]) => {
      if (heroRes.status === 403 || storyRes.status === 403 || catRes.status === 403) {
        setForbidden(true);
        return;
      }
      setHero({ ...EMPTY_HERO, ...(await heroRes.json()).hero });
      setBrandStoryImageUrl((await storyRes.json()).imageUrl);
      setCategories((await catRes.json()).categories);
    });
  }, []);

  if (forbidden) {
    return (
      <div>
        <h1 className="font-display text-2xl text-primary-deep">Settings</h1>
        <p className="mt-4 text-sm text-muted">You don&rsquo;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl text-primary-deep">Site Images</h1>
        <p className="mt-1 text-sm text-muted">The homepage banner, brand-story photo, and each category's photo.</p>
      </div>

      {hero && <HeroSection hero={hero} setHero={setHero} />}
      <BrandStorySection imageUrl={brandStoryImageUrl} setImageUrl={setBrandStoryImageUrl} />
      {categories && <CategoriesSection categories={categories} setCategories={setCategories} />}
    </div>
  );
}

function SaveButton({ onSave }: { onSave: () => Promise<boolean> }) {
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  async function handleClick() {
    setSaving(true);
    setState("idle");
    const ok = await onSave();
    setSaving(false);
    setState(ok ? "saved" : "error");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        className="bg-primary-deep text-bg px-6 py-2.5 text-sm hover:bg-primary disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {state === "saved" && <span className="text-xs text-green-700">Saved.</span>}
      {state === "error" && <span className="text-xs text-red-600">Something went wrong.</span>}
    </div>
  );
}

function ImageSlot({
  imageUrl,
  onUploaded,
  onRemove,
}: {
  imageUrl: string | null;
  onUploaded: (item: { id: string; url: string }) => void;
  onRemove: () => void;
}) {
  if (imageUrl) {
    return (
      <div className="max-w-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="aspect-[4/5] w-full object-cover border border-hairline" />
        <button type="button" onClick={onRemove} className="mt-2 text-xs text-red-600 hover:underline">
          Remove photo
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-xs">
      <DropzoneUpload onUploaded={onUploaded} />
    </div>
  );
}

function HeroSection({
  hero,
  setHero,
}: {
  hero: HeroContentValues;
  setHero: (h: HeroContentValues) => void;
}) {
  async function save() {
    const res = await fetch("/api/admin/settings/hero", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hero),
    });
    return res.ok;
  }

  return (
    <section className="border border-hairline bg-white p-5 space-y-5">
      <h2 className="text-sm font-medium text-primary-deep">Homepage banner</h2>

      <div>
        <label className="text-sm">Photo</label>
        <div className="mt-1.5">
          <ImageSlot
            imageUrl={hero.imageUrl}
            onUploaded={(item) => setHero({ ...hero, imageUrl: item.url })}
            onRemove={() => setHero({ ...hero, imageUrl: null })}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">Until a photo is set, the homepage shows a plain placeholder.</p>
      </div>

      <div>
        <label className="text-sm">Heading</label>
        <input
          value={hero.heading}
          onChange={(e) => setHero({ ...hero, heading: e.target.value })}
          className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="text-sm">Subheading</label>
        <textarea
          value={hero.subheading}
          onChange={(e) => setHero({ ...hero, subheading: e.target.value })}
          rows={3}
          className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Main button text</label>
          <input
            value={hero.primaryCta.label}
            onChange={(e) => setHero({ ...hero, primaryCta: { ...hero.primaryCta, label: e.target.value } })}
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm">Main button link</label>
          <input
            value={hero.primaryCta.href}
            onChange={(e) => setHero({ ...hero, primaryCta: { ...hero.primaryCta, href: e.target.value } })}
            placeholder="/shop"
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm">Second button text</label>
          <input
            value={hero.secondaryCta.label}
            onChange={(e) => setHero({ ...hero, secondaryCta: { ...hero.secondaryCta, label: e.target.value } })}
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm">Second button link</label>
          <input
            value={hero.secondaryCta.href}
            onChange={(e) => setHero({ ...hero, secondaryCta: { ...hero.secondaryCta, href: e.target.value } })}
            placeholder="/about"
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <SaveButton onSave={save} />
    </section>
  );
}

function BrandStorySection({
  imageUrl,
  setImageUrl,
}: {
  imageUrl: string | null | undefined;
  setImageUrl: (u: string | null) => void;
}) {
  async function save() {
    const res = await fetch("/api/admin/settings/brand-story", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: imageUrl ?? null }),
    });
    return res.ok;
  }

  if (imageUrl === undefined) return null;

  return (
    <section className="border border-hairline bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-primary-deep">Brand-story photo</h2>
        <p className="text-xs text-muted">The "Rooted in craft…" section further down the homepage.</p>
      </div>
      <ImageSlot imageUrl={imageUrl} onUploaded={(item) => setImageUrl(item.url)} onRemove={() => setImageUrl(null)} />
      <SaveButton onSave={save} />
    </section>
  );
}

function CategoriesSection({
  categories,
  setCategories,
}: {
  categories: CategoryImage[];
  setCategories: (c: CategoryImage[]) => void;
}) {
  async function saveOne(categoryId: string, mediaId: string | null) {
    await fetch("/api/admin/settings/category-images", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, mediaId }),
    });
  }

  if (categories.length === 0) {
    return (
      <section className="border border-hairline bg-white p-5">
        <h2 className="text-sm font-medium text-primary-deep">Category photos</h2>
        <p className="mt-2 text-sm text-muted">No categories yet — add some under Categories first.</p>
      </section>
    );
  }

  return (
    <section className="border border-hairline bg-white p-5 space-y-5">
      <div>
        <h2 className="text-sm font-medium text-primary-deep">Category photos</h2>
        <p className="text-xs text-muted">Shown on the homepage's "Shop by category" cards. Saves immediately.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((c, i) => (
          <div key={c.id}>
            <p className="text-xs text-muted mb-1.5">{c.name}</p>
            <ImageSlot
              imageUrl={c.imageUrl}
              onUploaded={(item) => {
                const next = categories.map((cat, j) => (j === i ? { ...cat, imageUrl: item.url } : cat));
                setCategories(next);
                saveOne(c.id, item.id);
              }}
              onRemove={() => {
                const next = categories.map((cat, j) => (j === i ? { ...cat, imageUrl: null } : cat));
                setCategories(next);
                saveOne(c.id, null);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
