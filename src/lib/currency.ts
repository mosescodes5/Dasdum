// Single source of truth for money. Nothing else in the codebase should
// mention a currency code, symbol or locale.
//
// Configure in .env (inlined at build time, so set them before `npm run build`):
//   NEXT_PUBLIC_CURRENCY=GBP     ISO 4217 code, e.g. GBP, USD, EUR
//   NEXT_PUBLIC_LOCALE=en-GB     BCP 47 locale used for number formatting
//
// All prices are stored and passed around as integers in the currency's
// minor unit (pence, cents, ...). Currencies with no minor unit (JPY) or
// three decimals (KWD) are handled via Intl, not by assuming 100.

export function getCurrency(): string {
  const c = process.env.NEXT_PUBLIC_CURRENCY?.trim().toUpperCase();
  if (!c) {
    throw new Error("NEXT_PUBLIC_CURRENCY is not set. Add e.g. NEXT_PUBLIC_CURRENCY=GBP to .env and rebuild.");
  }
  return c;
}

export function getLocale(): string {
  return process.env.NEXT_PUBLIC_LOCALE?.trim() || "en";
}

function formatter(maxFractionDigits?: number) {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: getCurrency(),
    ...(maxFractionDigits !== undefined ? { maximumFractionDigits: maxFractionDigits, minimumFractionDigits: 0 } : {}),
  });
}

/** Number of decimal places the configured currency uses (2 for GBP, 0 for JPY). */
export function minorDigits(): number {
  return formatter().resolvedOptions().maximumFractionDigits ?? 2;
}

/** Formats an integer amount in minor units, e.g. 1999 -> "£19.99". */
export function formatMoney(minor: number): string {
  return formatter().format(minor / 10 ** minorDigits());
}

/** Like formatMoney but without trailing decimals, for charts/tick labels. */
export function formatMoneyCompact(minor: number): string {
  return formatter(0).format(minor / 10 ** minorDigits());
}

/** Major-unit number (19.99) -> integer minor units (1999), avoiding float drift. */
export function toMinor(major: number): number {
  return Math.round(major * 10 ** minorDigits());
}

/** Integer minor units -> major-unit number, for editing in a form. */
export function fromMinor(minor: number): number {
  return minor / 10 ** minorDigits();
}

/** Lowercase code as Stripe expects it. */
export function stripeCurrency(): string {
  return getCurrency().toLowerCase();
}
