"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X, Loader2, AlertCircle } from "lucide-react";
import { shrinkImage } from "@/lib/shrink-image";
import { toMinor, getCurrency } from "@/lib/currency";

type Cat = { id: string; name: string };
type Row = {
  key: string;
  file: File;
  preview: string;
  state: "uploading" | "ready" | "error";
  error?: string;
  mediaId?: string;
  name: string;
  price: string; // in major units as typed, e.g. "25" or "24.99"
  shortDescription?: string;
  description?: string;
};

type Meta = { name?: string; price?: string; shortDescription?: string; description?: string };

/** Minimal CSV reader: handles quoted fields, commas and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const norm = (f: string) => f.trim().toLowerCase();
const stem = (f: string) => norm(f).replace(/\.[^.]+$/, "");

const CONCURRENCY = 3;
const BATCH = 50;

export default function BulkUploadPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultStock, setDefaultStock] = useState("1");
  const [publishReady, setPublishReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; published: number; drafts: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const meta = useRef<Map<string, Meta>>(new Map());
  const queue = useRef<Row[]>([]);
  const active = useRef(0);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d: any) => setCats(d.categories ?? []))
      .catch(() => {});
  }, []);

  const patch = (key: string, changes: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  async function uploadOne(row: Row) {
    try {
      const fd = new FormData();
      fd.append("file", await shrinkImage(row.file));
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.id) throw new Error(data.error ?? "Upload failed");
      patch(row.key, { state: "ready", mediaId: data.id });
    } catch (e) {
      patch(row.key, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  function pump() {
    while (active.current < CONCURRENCY && queue.current.length) {
      const next = queue.current.shift()!;
      active.current++;
      uploadOne(next).finally(() => {
        active.current--;
        pump();
      });
    }
  }

  const metaFor = (filename: string) => meta.current.get(norm(filename)) ?? meta.current.get(stem(filename));

  /** Reads a list like: filename,name,price,short_description,description */
  function loadList(text: string) {
    const table = parseCsv(text);
    const header = (table.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    const col = (n: string) => header.indexOf(n);
    if (col("filename") < 0) {
      setCsvNote("The first row must be a header that includes “filename”.");
      return;
    }
    meta.current = new Map();
    for (const r of table) {
      const get = (n: string) => (col(n) >= 0 ? (r[col(n)] ?? "").trim() : "");
      const fn = get("filename");
      if (!fn) continue;
      const m: Meta = { name: get("name"), price: get("price"), shortDescription: get("short_description"), description: get("description") };
      meta.current.set(norm(fn), m);
      meta.current.set(stem(fn), m);
    }
    let matched = 0;
    setRows((prev) =>
      prev.map((row) => {
        const m = metaFor(row.file.name);
        if (!m) return row;
        matched++;
        return { ...row, name: m.name || row.name, price: m.price || row.price, shortDescription: m.shortDescription, description: m.description };
      })
    );
    // setRows runs async; report using the list size and let the cards show the result.
    setCsvNote(`List loaded (${table.length} rows). Photos are matched by filename, now or when you add them.`);
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setResult(null);
    const added: Row[] = files.map((file) => {
      const m = metaFor(file.name);
      return {
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        state: "uploading" as const,
        name: m?.name ?? "",
        price: m?.price ?? "",
        shortDescription: m?.shortDescription,
        description: m?.description,
      };
    });
    setRows((prev) => [...prev, ...added]);
    queue.current.push(...added);
    pump();
  }

  const ready = rows.filter((r) => r.state === "ready");
  const uploading = rows.filter((r) => r.state === "uploading").length;
  const failed = rows.filter((r) => r.state === "error").length;

  const toMinorOrUndef = (v: string) => {
    const n = Number(v);
    return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? toMinor(n) : undefined;
  };

  async function save() {
    setError(null);
    if (!categoryId) return setError("Choose a category first.");
    setSaving(true);
    let created = 0, published = 0, drafts = 0;
    try {
      for (let i = 0; i < ready.length; i += BATCH) {
        const chunk = ready.slice(i, i + BATCH);
        const res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            defaultPrice: toMinorOrUndef(defaultPrice) ?? 0,
            defaultStock: Number(defaultStock) || 0,
            publishReady,
            items: chunk.map((r) => ({ mediaId: r.mediaId, name: r.name.trim() || undefined, shortDescription: r.shortDescription || undefined, description: r.description || undefined, price: toMinorOrUndef(r.price) })),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn’t save the products.");
        created += data.created; published += data.published; drafts += data.drafts;
        const done = new Set(chunk.map((r) => r.key));
        setRows((prev) => prev.filter((r) => !done.has(r.key)));
      }
      setResult({ created, published, drafts });
    } catch (e) {
      setError((e instanceof Error ? e.message : "Something went wrong.") + (created ? ` ${created} product(s) were already saved.` : ""));
    } finally {
      setSaving(false);
    }
  }

  // Enter in a name box jumps to the next one, so you can type names down the page.
  function onNameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const all = Array.from(document.querySelectorAll<HTMLInputElement>("[data-name-input]"));
    all[all.indexOf(e.currentTarget) + 1]?.focus();
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-deep">
        <ArrowLeft size={14} /> Products
      </Link>
      <h1 className="mt-3 font-display text-2xl text-primary-deep">Bulk upload photos</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Drop in all your product photos — one photo per product. Each becomes its own product. Add names and prices now, or leave
        them blank: unnamed products are saved as drafts you can finish later and never appear in the shop until you publish them.
      </p>

      <div className="mt-6 grid gap-4 border border-hairline p-4 sm:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          Category for these products
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm">
            <option value="">Choose…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Default price ({getCurrency()})
          <input value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} inputMode="decimal" placeholder="e.g. 25" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm">
          Stock each
          <input value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)} inputMode="numeric" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm" />
        </label>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? "border-gold bg-soft" : "border-hairline hover:border-gold"}`}
      >
        <ImagePlus size={28} className="text-gold-text" />
        <span className="text-sm font-medium text-primary-deep">Drop photos here, or click to choose them</span>
        <span className="text-xs text-muted">Select as many as you like at once. Big photos are shrunk automatically.</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
      </label>

      <details className="mt-4 border border-hairline p-4 text-sm">
        <summary className="cursor-pointer font-medium text-primary-deep">Have a list of names? Fill them in automatically</summary>
        <p className="mt-3 text-muted">
          Paste or upload a list with the columns <code>filename, name, price, short_description, description</code> (only <code>filename</code> is required).
          Each row is matched to the photo with the same filename, so don’t rename your photos.
        </p>
        <textarea
          rows={4}
          placeholder={"filename,name,price,short_description\nIMG_0012.jpg,Cream Leather Sneakers,45,Soft leather low-top trainers"}
          onChange={(e) => e.target.value.trim() && loadList(e.target.value)}
          className="mt-3 w-full border border-hairline px-3 py-2 font-mono text-xs"
        />
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-2 text-xs"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) loadList(await f.text()); e.target.value = ""; }}
        />
        {csvNote && <p className="mt-2 text-xs text-primary-deep">{csvNote}</p>}
      </details>

      {result && (
        <div className="mt-5 border border-gold/50 bg-soft p-4 text-sm" role="status">
          <b>{result.created} products created</b> — {result.published} published, {result.drafts} saved as drafts.{" "}
          <Link href="/admin/products?status=draft" className="font-bold text-primary-deep underline">Finish the drafts</Link>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {ready.length} ready{uploading > 0 && <> · <Loader2 size={13} className="inline animate-spin" /> {uploading} uploading</>}
              {failed > 0 && <span className="text-red-600"> · {failed} failed</span>}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publishReady} onChange={(e) => setPublishReady(e.target.checked)} />
              Publish products that have a name and a price
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => (
              <div key={r.key} className="border border-hairline">
                <div className="relative aspect-square bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt="" className={`h-full w-full object-cover ${r.state === "uploading" ? "opacity-50" : ""}`} />
                  {r.state === "uploading" && <Loader2 size={22} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary-deep" />}
                  {r.state === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/85 p-2 text-center text-xs text-red-600">
                      <AlertCircle size={18} /> {r.error}
                    </div>
                  )}
                  <button type="button" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))} aria-label="Remove photo" className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center bg-white/90 hover:bg-white">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2 p-2.5">
                  <input data-name-input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} onKeyDown={onNameKey} placeholder="Name (optional)" className="w-full border border-hairline px-2.5 py-2 text-sm" />
                  <input value={r.price} onChange={(e) => patch(r.key, { price: e.target.value })} inputMode="decimal" placeholder={defaultPrice ? `Price (${defaultPrice})` : "Price (optional)"} className="w-full border border-hairline px-2.5 py-2 text-sm" />
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

          <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-hairline bg-bg py-4">
            <span className="text-sm text-muted">{ready.length} product{ready.length === 1 ? "" : "s"} will be created</span>
            <button type="button" onClick={save} disabled={saving || uploading > 0 || ready.length === 0} className="bg-primary-deep px-6 py-2.5 text-sm text-bg hover:bg-primary disabled:opacity-50">
              {saving ? "Saving…" : uploading > 0 ? "Waiting for uploads…" : `Create ${ready.length} product${ready.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
