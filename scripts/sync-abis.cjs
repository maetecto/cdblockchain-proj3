// scripts/sync-abis.cjs
const fs = require("fs");
const path = require("path");

const contracts = ["DEXToken", "PawNFT", "DEXNFTMarket"];

for (const name of contracts) {
  const src = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${name}.sol`,
    `${name}.json`
  );
  const dst = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "abis",
    `${name}.json`
  );

  if (!fs.existsSync(src)) {
    console.error(`[sync-abis] Artifact not found: ${src}`);
    continue;
  }

  fs.copyFileSync(src, dst);
  console.log(`[sync-abis] Copied ${src} -> ${dst}`);
}

console.log("[sync-abis] Done.");