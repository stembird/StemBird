/**
 * Run: npx tsx src/lib/completeFunctionCatalog.test.ts
 */
import { completeFunctionCatalog } from "./completeFunctionCatalog";
import { FALLBACK_JOB_FUNCTIONS } from "./jobParseNormalization";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const live = [
  { name: "Technical Sales & Business Development", count: 12 },
  { name: "Software Development & Engineering", count: 4 },
];

const catalog = completeFunctionCatalog(live);

assert(
  catalog.length === FALLBACK_JOB_FUNCTIONS.length,
  `expected ${FALLBACK_JOB_FUNCTIONS.length} functions, got ${catalog.length}`
);
assert(
  catalog[0].name === "Technical Sales & Business Development" && catalog[0].count === 12,
  "Technical Sales & Business Development leads"
);
assert(
  catalog.some((f) => f.name === "Cybersecurity" && f.count === 0),
  "zero-count catalog functions are present"
);
assert(
  catalog.filter((f) => f.name === "Software Development & Engineering").length === 1,
  "no duplicate live functions"
);

const withUnknown = completeFunctionCatalog([
  ...live,
  { name: "Custom Niche Role", count: 3 },
]);
assert(
  withUnknown.some((f) => f.name === "Custom Niche Role" && f.count === 3),
  "unknown live functions are kept"
);

console.log("completeFunctionCatalog ok");
