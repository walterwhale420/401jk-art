#!/usr/bin/env node
/**
 * update-trades.mjs — refresh the last MARKETPLACE SALE of every 401jK NFT,
 * read directly from the Solana chain (no API key, no marketplace API).
 *
 * Why on-chain instead of a marketplace API: the 2026-06-20 launch sold
 * through Tensor (program TCMPhJdw… `tcomp`, instruction `BuyCore`), and a
 * marketplace's own API (Magic Eden, Tensor) is either blind to the other
 * venue or gated behind a paid key. Every sale, on any marketplace, settles
 * on-chain — so we read it from the public RPC.
 *
 * A "sale" = a transaction that (a) touches a known marketplace program AND
 * (b) moves SOL. The headline price is the **largest single SOL transfer** in
 * that transaction (the payment to the seller); royalty + marketplace fees are
 * smaller separate transfers. The auction's *direct* distribution transfers
 * (a plain Metaplex Core Transfer signed by the project wallet, with NO SOL
 * movement) carry no marketplace program and no payment, so they're correctly
 * ignored and that NFT reads "No trades yet".
 *
 * Reads:  data/collection.json  (nfts[].mintAddress)
 * Writes: data/trades.json      (generated — do not hand-edit)
 *
 *   node scripts/update-trades.mjs
 *
 * Optional env:
 *   SOLANA_RPC_URL   override the RPC endpoint (default: public mainnet-beta).
 *                    Recommended for CI — the public endpoint rate-limits the
 *                    getTransaction calls this script makes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Known marketplace programs → label. Presence of any of these (plus a SOL
// transfer) marks a transaction as a sale.
const MARKETPLACES = new Map([
  ["TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp", "tensor"],   // Tensor tcomp (Core / compressed)
  ["TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN", "tensor"],   // Tensorswap
  ["M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K", "magiceden"],// Magic Eden v2 (M2)
  ["mmm3XBJg5gk8XJxEKBvdgptZz6SgK4tXvn36sodowMc", "magiceden"],// Magic Eden MMM
]);
const SYS_PROGRAM = "11111111111111111111111111111111";

const SIG_LIMIT = 12;       // recent signatures scanned per mint
const TX_SCAN_CAP = 8;      // transactions decoded per mint before giving up
const THROTTLE_MS = 130;    // between RPC calls
const MAX_RETRIES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < MAX_RETRIES) { await sleep(800 * 2 ** attempt); continue; }
      throw new Error(`RPC ${method} HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) {
      // -32005 = node behind / rate limited on some providers
      if (json.error.code === -32005 && attempt < MAX_RETRIES) { await sleep(800 * 2 ** attempt); continue; }
      throw new Error(`RPC ${method}: ${JSON.stringify(json.error)}`);
    }
    return json.result;
  }
}

/** Collect every program id referenced by a (jsonParsed) transaction. */
function programIds(tx) {
  const ids = new Set();
  for (const ix of tx.transaction.message.instructions) {
    if (ix.programId) ids.add(ix.programId);
  }
  for (const inner of tx.meta?.innerInstructions || []) {
    for (const ix of inner.instructions) if (ix.programId) ids.add(ix.programId);
  }
  return ids;
}

/** Largest single System-program SOL transfer (lamports) in the tx. */
function largestTransferLamports(tx) {
  let max = 0;
  const consider = (ix) => {
    if (ix.program === "system" && ix.parsed?.type === "transfer") {
      const l = Number(ix.parsed.info.lamports || 0);
      if (l > max) max = l;
    }
  };
  for (const ix of tx.transaction.message.instructions) consider(ix);
  for (const inner of tx.meta?.innerInstructions || []) {
    for (const ix of inner.instructions) consider(ix);
  }
  return max;
}

/** Most recent marketplace sale for one mint, or null. */
async function lastSale(mint) {
  const sigs = await rpc("getSignaturesForAddress", [mint, { limit: SIG_LIMIT }]);
  await sleep(THROTTLE_MS);

  let scanned = 0;
  for (const s of sigs) {
    if (s.err) continue;
    if (scanned >= TX_SCAN_CAP) break;
    scanned++;

    const tx = await rpc("getTransaction", [
      s.signature,
      { maxSupportedTransactionVersion: 0, encoding: "jsonParsed" },
    ]);
    await sleep(THROTTLE_MS);
    if (!tx) continue;

    const ids = programIds(tx);
    let market = null;
    for (const id of ids) if (MARKETPLACES.has(id)) { market = MARKETPLACES.get(id); break; }
    if (!market) continue; // not a marketplace tx (e.g. a plain transfer)

    const lamports = largestTransferLamports(tx);
    if (lamports < 1_000_000) continue; // < 0.001 SOL — listing/cancel, not a sale

    return {
      priceSol: Math.round((lamports / 1e9) * 1e6) / 1e6,
      date: new Date((tx.blockTime || s.blockTime) * 1000).toISOString(),
      signature: s.signature,
      marketplace: market,
    };
  }
  return null;
}

async function main() {
  const collection = JSON.parse(
    readFileSync(join(ROOT, "data", "collection.json"), "utf8")
  );
  const nfts = collection.nfts.filter((n) => n.mintAddress);

  const outPath = join(ROOT, "data", "trades.json");
  let previous = null;
  try { previous = JSON.parse(readFileSync(outPath, "utf8")); } catch { /* first run */ }
  const prevTrades = previous?.trades || {};

  const trades = {};
  let salesFound = 0, errors = 0;

  for (const nft of nfts) {
    try {
      const sale = await lastSale(nft.mintAddress);
      if (sale) {
        trades[nft.mintAddress] = { id: nft.id, title: nft.title, ...sale };
        salesFound++;
        console.log(`  ${nft.title}: ${sale.priceSol} SOL (${sale.marketplace})`);
      }
    } catch (err) {
      // A transient RPC failure must not erase a sale we already know about.
      errors++;
      console.warn(`! ${nft.mintAddress} (${nft.title}): ${err.message}`);
      if (prevTrades[nft.mintAddress]) {
        trades[nft.mintAddress] = prevTrades[nft.mintAddress];
        salesFound++;
      }
    }
  }

  // Idempotent / no-noise: only rewrite when the sale set actually changed.
  const unchanged =
    previous && JSON.stringify(previous.trades) === JSON.stringify(trades);
  if (unchanged) {
    console.log(`No trade changes — left data/trades.json untouched (${salesFound} sales).`);
    if (errors) process.exitCode = 1;
    return;
  }

  const out = {
    _readme:
      "GENERATED by scripts/update-trades.mjs — do not hand-edit. Last on-chain MARKETPLACE SALE per mint (Tensor / Magic Eden), read from the Solana RPC. 'priceSol' is the largest single SOL transfer in the sale tx (the seller's payment / headline price; royalties + fees are separate smaller transfers). NFTs distributed by direct transfer (no marketplace, no payment) are absent and render as 'No trades yet'. 'date' is the sale block time (ISO); the front-end derives the '3d ago' label from it. 'updatedAt' only changes when a sale changes.",
    updatedAt: new Date().toISOString(),
    source: "solana-rpc-onchain",
    salesCount: salesFound,
    trades,
  };
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote data/trades.json — ${salesFound} sale(s) across ${nfts.length} NFTs.`);
  if (errors) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
