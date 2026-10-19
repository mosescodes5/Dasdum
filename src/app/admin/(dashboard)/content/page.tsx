"use client";

import { useEffect, useState } from "react";
import type { SiteContentValues } from "@/lib/validation/admin-site-content";

const inputCls = "mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm";

// The API enforces requireDeveloper() (DEVELOPER_EMAIL only) — the sidebar
// link is only a convenience; a 403 here just means someone else reached
// the URL directly.
export default function AdminContentPage() {
  const [content, setContent] = useState<SiteContentValues | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/admin/settings/content").then(async (res) => {
      if (res.status === 403) return setForbidden(true);
      setContent((await res.json()).content);
    });
  }, []);

  async function save() {
    if (!content) return;
    setSaving(true);
    setState("idle");
    const res = await fetch("/api/admin/settings/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    setSaving(false);
    setState(res.ok ? "saved" : "error");
  }

  if (forbidden) {
    return (
      <div>
        <h1 className="font-display text-2xl text-primary-deep">Site Content</h1>
        <p className="mt-4 text-sm text-muted">You don&rsquo;t have access to this page.</p>
      </div>
    );
  }
  if (!content) return <p className="text-sm text-muted">Loading…</p>;

  const set = (patch: Partial<SiteContentValues>) => setContent({ ...content, ...patch });
  const { brandStory, whyDasdum, about } = content;

  return (
    <div className="max-w-2xl space-y-8 pb-24">
      <div>
        <h1 className="font-display text-2xl text-primary-deep">Site Content</h1>
        <p className="mt-1 text-sm text-muted">
          The wording of the homepage story section, the &ldquo;Why&rdquo; pillars and the About page. Photos are under Site Images.
        </p>
      </div>

      <section className="border border-hairline bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-primary-deep">Homepage story section</h2>
        <div>
          <label className="text-sm">Heading</label>
          <input
            className={inputCls}
            value={brandStory.heading}
            onChange={(e) => set({ brandStory: { ...brandStory, heading: e.target.value } })}
          />
        </div>
        <div>
          <label className="text-sm">Handwritten tagline (also shown in the homepage banner)</label>
          <input
            className={inputCls}
            value={brandStory.tagline}
            onChange={(e) => set({ brandStory: { ...brandStory, tagline: e.target.value } })}
          />
        </div>
        {brandStory.paragraphs.map((p, i) => (
          <div key={i}>
            <div className="flex items-center justify-between">
              <label className="text-sm">Paragraph {i + 1}</label>
              {brandStory.paragraphs.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() =>
                    set({ brandStory: { ...brandStory, paragraphs: brandStory.paragraphs.filter((_, j) => j !== i) } })
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              rows={4}
              className={inputCls}
              value={p}
              onChange={(e) =>
                set({
                  brandStory: {
                    ...brandStory,
                    paragraphs: brandStory.paragraphs.map((t, j) => (j === i ? e.target.value : t)),
                  },
                })
              }
            />
          </div>
        ))}
        {brandStory.paragraphs.length < 4 && (
          <button
            type="button"
            className="text-xs text-primary-deep link-underline"
            onClick={() => set({ brandStory: { ...brandStory, paragraphs: [...brandStory.paragraphs, ""] } })}
          >
            + Add paragraph
          </button>
        )}
        <div>
          <label className="text-sm">Link text (goes to the About page)</label>
          <input
            className={inputCls}
            value={brandStory.linkLabel}
            onChange={(e) => set({ brandStory: { ...brandStory, linkLabel: e.target.value } })}
          />
        </div>
      </section>

      <section className="border border-hairline bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-primary-deep">&ldquo;Why&rdquo; pillars</h2>
        <div>
          <label className="text-sm">Section heading</label>
          <input
            className={inputCls}
            value={whyDasdum.heading}
            onChange={(e) => set({ whyDasdum: { ...whyDasdum, heading: e.target.value } })}
          />
        </div>
        {whyDasdum.pillars.map((pl, i) => (
          <div key={i} className="border-t border-hairline pt-4">
            <label className="text-sm">Pillar {i + 1} title</label>
            <input
              className={inputCls}
              value={pl.title}
              onChange={(e) =>
                set({
                  whyDasdum: {
                    ...whyDasdum,
                    pillars: whyDasdum.pillars.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  },
                })
              }
            />
            <textarea
              rows={2}
              className={inputCls}
              value={pl.body}
              onChange={(e) =>
                set({
                  whyDasdum: {
                    ...whyDasdum,
                    pillars: whyDasdum.pillars.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                  },
                })
              }
            />
          </div>
        ))}
      </section>

      <section className="border border-hairline bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-primary-deep">About page</h2>
        <div>
          <label className="text-sm">Heading</label>
          <input
            className={inputCls}
            value={about.heading}
            onChange={(e) => set({ about: { ...about, heading: e.target.value } })}
          />
        </div>
        <div>
          <label className="text-sm">Introduction</label>
          <textarea
            rows={3}
            className={inputCls}
            value={about.intro}
            onChange={(e) => set({ about: { ...about, intro: e.target.value } })}
          />
        </div>
        {about.sections.map((s, i) => (
          <div key={i} className="border-t border-hairline pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Section {i + 1} title</label>
              {about.sections.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => set({ about: { ...about, sections: about.sections.filter((_, j) => j !== i) } })}
                >
                  Remove section
                </button>
              )}
            </div>
            <input
              className={inputCls}
              value={s.title}
              onChange={(e) =>
                set({
                  about: {
                    ...about,
                    sections: about.sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  },
                })
              }
            />
            <textarea
              rows={4}
              className={inputCls}
              value={s.body}
              onChange={(e) =>
                set({
                  about: {
                    ...about,
                    sections: about.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                  },
                })
              }
            />
          </div>
        ))}
        {about.sections.length < 8 && (
          <button
            type="button"
            className="text-xs text-primary-deep link-underline"
            onClick={() => set({ about: { ...about, sections: [...about.sections, { title: "", body: "" }] } })}
          >
            + Add section
          </button>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-primary-deep text-bg px-6 py-2.5 text-sm hover:bg-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {state === "saved" && <span className="text-xs text-green-700">Saved.</span>}
        {state === "error" && (
          <span className="text-xs text-red-600">
            Couldn&rsquo;t save — every field must be filled in and within its length limit.
          </span>
        )}
      </div>
    </div>
  );
}
