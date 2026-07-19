/** Fryser marknadsbrevsarkivet: beräknar alla nummer ur DB:n med GÄLLANDE
 *  regler och skriver data/newsletter-issues.json. Körs vid varje AF-import
 *  (importgrinden, docs/DATA_PIPELINE.md) och committas — därefter är numren
 *  oföränderliga. Kör: cd frontend && npx tsx scripts/freeze-issues.ts */
import { writeFileSync } from "fs";
import { join } from "path";
import { computeAllIssuesLive } from "../lib/newsletter";

async function main() {
  const issues = await computeAllIssuesLive();
  const out = join(process.cwd(), "data", "newsletter-issues.json");
  writeFileSync(out, JSON.stringify(issues, null, 1) + "\n");
  console.log(`FRYST: ${issues.length} nummer -> ${out} (${issues.map((i) => i.slug).join(", ")})`);
}
main();
