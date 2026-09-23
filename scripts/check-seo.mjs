// Static checks that the required SEO surface exists in the repo.
// Run with: npm run check-seo
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const requiredFiles = [
  "app/sitemap.ts",
  "app/robots.ts",
  "app/not-found.tsx",
  "app/opengraph-image.tsx",
  "app/layout.tsx",
];

for (const file of requiredFiles) {
  check(existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

const rootLayout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
check(
  rootLayout.includes("metadataBase"),
  "app/layout.tsx must define metadataBase",
);
check(
  rootLayout.includes("openGraph"),
  "app/layout.tsx must define default Open Graph metadata",
);

const landingPage = readFileSync(path.join(root, "app/page.tsx"), "utf8");
check(
  landingPage.includes("export const metadata"),
  "app/page.tsx must export page-specific metadata",
);
check(
  landingPage.includes("application/ld+json"),
  "app/page.tsx must include JSON-LD structured data",
);

const protectedLayoutPath = path.join(root, "app/(protected)/layout.tsx");
if (existsSync(protectedLayoutPath)) {
  const protectedLayout = readFileSync(protectedLayoutPath, "utf8");
  check(
    protectedLayout.includes("index: false"),
    "app/(protected)/layout.tsx must set robots.index = false",
  );
} else {
  failures.push("Missing app/(protected)/layout.tsx");
}

const authLayoutPath = path.join(root, "app/(auth)/layout.tsx");
if (existsSync(authLayoutPath)) {
  const authLayout = readFileSync(authLayoutPath, "utf8");
  check(
    authLayout.includes("index: false"),
    "app/(auth)/layout.tsx must set robots.index = false",
  );
} else {
  failures.push("Missing app/(auth)/layout.tsx");
}

if (failures.length > 0) {
  console.error("SEO check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("SEO check passed.");
