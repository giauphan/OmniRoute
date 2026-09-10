const fs = require("fs");
const file = "open-sse/services/genericQuotaFetcher.ts";
let code = fs.readFileSync(file, "utf8");

const helper = `
function aggregateGroupedQuotaValues(
  windows: Record<string, { percentUsed: number; resetAt: string | null }>
): { percentUsed: number; resetAt: string | null } {
  const effectiveByBase = new Map<string, { percentUsed: number; resetAt: string | null }>();
  for (const [key, entry] of Object.entries(windows)) {
    const base = key.endsWith("_freetrial") ? key.slice(0, -10) : key;
    const cur = effectiveByBase.get(base);
    if (!cur || entry.percentUsed < cur.percentUsed) {
      effectiveByBase.set(base, { percentUsed: entry.percentUsed, resetAt: entry.resetAt ?? null });
    }
  }
  let percentUsed = 0;
  let resetAt: string | null = null;
  for (const eff of effectiveByBase.values()) {
    if (eff.percentUsed > percentUsed) {
      percentUsed = eff.percentUsed;
      resetAt = eff.resetAt;
    }
  }
  return { percentUsed, resetAt };
}

export function convertUsageToQuotaInfo(
`;

code = code.replace(/export function convertUsageToQuotaInfo\(/, helper);

const toReplace = `  const effectiveByBase = new Map<string, { percentUsed: number; resetAt: string | null }>();
  for (const [key, entry] of Object.entries(providerScopedWindows)) {
    const base = key.endsWith("_freetrial") ? key.slice(0, -10) : key;
    const cur = effectiveByBase.get(base);
    if (!cur || entry.percentUsed < cur.percentUsed) {
      effectiveByBase.set(base, { percentUsed: entry.percentUsed, resetAt: entry.resetAt ?? null });
    }
  }
  let percentUsed = 0;
  let resetAt: string | null = null;
  for (const eff of effectiveByBase.values()) {
    if (eff.percentUsed > percentUsed) {
      percentUsed = eff.percentUsed;
      resetAt = eff.resetAt;
    }
  }`;
code = code.replace(
  toReplace,
  "  const { percentUsed, resetAt } = aggregateGroupedQuotaValues(providerScopedWindows);"
);

fs.writeFileSync(file, code);
