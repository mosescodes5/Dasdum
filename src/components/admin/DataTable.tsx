"use client";

import { useState } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
  emptyMessage?: string;
};

export function DataTable<T>({ columns, rows, getRowId, onBulkDelete, emptyMessage = "No results." }: Props<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(getRowId)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (!onBulkDelete || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected item${selected.size === 1 ? "" : "s"}? This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    await onBulkDelete(Array.from(selected));
    setSelected(new Set());
    setDeleting(false);
  }

  return (
    <div className="border border-hairline bg-white">
      {onBulkDelete && selected.size > 0 && (
        <div className="flex items-center justify-between bg-primary-deep text-bg px-4 py-2.5 text-sm">
          <span>{selected.size} selected</span>
          <button onClick={handleBulkDelete} disabled={deleting} className="underline decoration-gold disabled:opacity-60">
            {deleting ? "Deleting…" : "Delete selected"}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-hairline">
              {onBulkDelete && (
                <th className="w-10 py-3 px-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={`py-3 px-4 font-normal ${col.className ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onBulkDelete ? 1 : 0)} className="py-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} className="border-b border-hairline last:border-0 hover:bg-bg/60">
                    {onBulkDelete && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`py-3 px-4 ${col.className ?? ""}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
