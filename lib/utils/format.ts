const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        ...(compact
          ? { notation: "compact", maximumFractionDigits: 1 }
          : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      });
    } catch {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    formatters.set(key, f);
  }
  return f;
}

/** "$1,240.00" — money is always shown in the user's profile currency. */
export function formatMoney(amount: number, currency = "USD"): string {
  return getFormatter(currency, false).format(amount);
}

/** "$1.2K" for tight spaces like chart axes. */
export function formatMoneyCompact(amount: number, currency = "USD"): string {
  return getFormatter(currency, true).format(amount);
}

/** Drops ".00" for whole amounts in running copy: "$1,240 due this week". */
export function formatMoneyShort(amount: number, currency = "USD"): string {
  const full = formatMoney(amount, currency);
  return full.endsWith(".00") ? full.slice(0, -3) : full;
}

/** "$", "€", "₹", "CA$"… for input prefixes. */
export function currencySymbol(currency = "USD"): string {
  try {
    const part = new Intl.NumberFormat("en-US", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
