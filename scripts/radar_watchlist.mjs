#!/usr/bin/env node
/**
 * Privat bevakningslista för Lisa — körs med `node scripts/radar_watchlist.mjs`.
 *
 * Sajten håller neutral ton publikt (/handelser + profilernas Radarn-ruta).
 * Det här skriptet är BARA för dig: det listar leverantörer som syns i AF:s
 * söktjänst men saknar synligt kontor i sina avtalsområden, och FLAGGAR särskilt
 * grannkommun-fallen — en leverantör med kontor i ett angränsande delområde
 * (t.ex. Danderyd i Stockholm Nord medan avtalet är Stockholm Mitt), som kan
 * vara på väg att ta avtal i det området. Kör efter varje ny radar-snapshot.
 *
 * Läser publika tabeller via Supabase REST (anon-nyckel, samma som frontend).
 * Inga beroenden.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hzypdzhanxoybqevoonj.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eXBkemhhbnhveWJxZXZvb25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDY0MjQsImV4cCI6MjA4OTE4MjQyNH0.Zw66V3ToRdqOWeWbUqtkGLiEpbtM2rodHy4UV6K3oqk";

async function q(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const lower = (s) => (s ?? "").toLowerCase();

async function main() {
  // Senaste datum
  const [latestStat] = await q("rom_results?select=dataset_date&order=dataset_date.desc&limit=1");
  const [latestSnap] = await q("sokleverantor_office_snapshots?select=snapshot_date&order=snapshot_date.desc&limit=1");
  const statDate = latestStat.dataset_date, snapDate = latestSnap.snapshot_date;

  const [stats, offices, muni, suppliers, variants] = await Promise.all([
    q(`rom_results?select=supplier,delivery_area&dataset_date=eq.${statDate}`),
    q(`sokleverantor_office_snapshots?select=supplier_name,postort&snapshot_date=eq.${snapDate}`),
    q("delivery_area_municipalities?select=kommun,delivery_area"),
    q("suppliers?select=id,name,slug"),
    q("supplier_name_variants?select=variant,supplier_id"),
  ]);

  const areaByKommun = new Map(muni.map((m) => [lower(m.kommun), m.delivery_area]));
  const supByName = new Map(suppliers.map((s) => [lower(s.name), s]));
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  for (const v of variants) { const s = byId.get(v.supplier_id); if (s) supByName.set(lower(v.variant), s); }

  // Kontor per leverantör (mappade till område via postort=kommun)
  const officesBySup = new Map();
  for (const o of offices) {
    const s = supByName.get(lower(o.supplier_name));
    if (!s) continue;
    (officesBySup.get(s.id) ?? officesBySup.set(s.id, []).get(s.id)).push(o.postort);
  }
  // Avtalsområden per leverantör
  const contractAreas = new Map();
  for (const r of stats) {
    const s = supByName.get(lower(r.supplier));
    if (!s) continue;
    (contractAreas.get(s.id) ?? contractAreas.set(s.id, new Set()).get(s.id)).add(r.delivery_area);
  }

  const neighbor = [], faraway = [];
  for (const [supId, areas] of contractAreas) {
    const posts = officesBySup.get(supId);
    if (!posts || !posts.length) continue; // helt osynlig — annan lista
    const uniqPosts = [...new Set(posts)];
    const officeAreas = uniqPosts.map((p) => areaByKommun.get(lower(p)));
    if (officeAreas.some((a) => a === undefined)) continue; // omappbar ort → inget påstående
    const covered = new Set(officeAreas);
    const uncovered = [...areas].filter((a) => !covered.has(a));
    if (!uncovered.length) continue;
    const sup = byId.get(supId);
    for (const area of uncovered) {
      const rec = {
        supplier: sup.name, slug: sup.slug, area,
        offices: uniqPosts.map((p) => `${p} (${areaByKommun.get(lower(p))})`).join(", "),
      };
      // Grannkommun: något kontorsområde delar första ordet med avtalsområdet
      const family = area.split(" ")[0];
      const isNeighbor = officeAreas.some((oa) => oa && oa.split(" ")[0] === family);
      (isNeighbor ? neighbor : faraway).push(rec);
    }
  }

  const site = "https://ro-m-insight.vercel.app";
  console.log(`# Radar-bevakningslista (privat)`);
  console.log(`Statistik ${statDate} · söktjänst-kontroll ${snapDate}\n`);
  console.log(`## ⚑ GRANNKOMMUN — bevaka (${neighbor.length}) — kontor i angränsande delområde, kan vara på väg in`);
  for (const r of neighbor.sort((a, b) => a.supplier.localeCompare(b.supplier, "sv")))
    console.log(`- ${r.supplier} — avtal i ${r.area}, kontor i: ${r.offices}\n  ${site}/leverantorer/${r.slug}`);
  console.log(`\n## Övriga (${faraway.length}) — kontor långt från avtalsområdet`);
  for (const r of faraway.sort((a, b) => a.supplier.localeCompare(b.supplier, "sv")))
    console.log(`- ${r.supplier} — avtal i ${r.area}, kontor i: ${r.offices}`);
  console.log(`\n(${neighbor.length + faraway.length} avtalspar totalt. Publikt visas allt neutralt utan grannkommun-uppdelning.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
