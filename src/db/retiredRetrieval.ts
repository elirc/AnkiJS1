import Dexie from "dexie";
import { db, type Card } from "./schema";

let hashes: Promise<Record<string, string>> | undefined;
function loadHashes() {
  hashes ??= import("../data/retired-retrieval-hashes.json?raw")
    .then(module => JSON.parse(module.default) as Record<string, string>)
    .catch(error => { hashes = undefined; throw error; });
  return hashes;
}

export async function unchangedRetiredRetrievalCards(): Promise<Card[]> {
  const candidates = await db.cards.where(":id").between("a1000000-", "a1000000-\uffff")
    .filter(card => !card.deleted_at).toArray();
  if (!candidates.length) return [];
  // Imports and Web Crypto are external promises; preserve the caller's IDB transaction.
  return Dexie.waitFor((async () => {
    const originals = await loadHashes();
    const encoder = new TextEncoder();
    const unchanged: Card[] = [];
    for (let offset = 0; offset < candidates.length; offset += 250) {
      const batch = await Promise.all(candidates.slice(offset, offset + 250).map(async card => {
        if (!originals[card.id]) return undefined;
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify([card.front, card.back])));
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        return hash === originals[card.id] ? card : undefined;
      }));
      unchanged.push(...batch.filter((card): card is Card => Boolean(card)));
    }
    return unchanged;
  })(), 120_000);
}
