import type { StarterCard } from "./curriculum";

interface ExpansionPack { id: string; cards: StarterCard[] }
interface ExpansionManifest {
  version: number;
  sections: { id: string; added: number }[];
  chunks: string[];
}

// The base curriculum must build before optional generated packs are available.
// Once generated, the manifest and all referenced chunks ship together.
const manifests = import.meta.glob<string>("./section-expansion-manifest.json", {
  eager: true, query: "?raw", import: "default",
});
const rawManifest = manifests["./section-expansion-manifest.json"];
const manifest: ExpansionManifest | undefined = rawManifest ? JSON.parse(rawManifest) : undefined;
export const sectionExpansionVersion = manifest?.version ?? 6;
const additions = new Map<string, number>(
  manifest?.sections.map((section) => [section.id, section.added]) ?? [],
);
export const sectionAdditionCount = (deckId: string): number => additions.get(deckId) ?? 0;

// Archived automatic drills are retained for migration audits, not bundled.
const chunks = import.meta.glob<string>("./section-packs/reviewed-*.json", {
  query: "?raw", import: "default",
});
let loading: Promise<ExpansionPack[]> | undefined;
export function loadSectionExpansion(): Promise<ExpansionPack[]> {
  loading ??= Promise.all((manifest?.chunks ?? []).map(async (name) => {
    const load = chunks[`./section-packs/${name}`];
    if (!load) throw new Error(`Missing curriculum chunk: ${name}`);
    return JSON.parse(await load()) as ExpansionPack[];
  })).then((packs) => packs.flat()).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
