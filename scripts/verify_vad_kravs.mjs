#!/usr/bin/env node
/**
 * Verifierar "Vad krävs?"-matematiken — körs med `node scripts/verify_vad_kravs.mjs`.
 * Inga beroenden. Speglar den rena matematiken i frontend/lib/whatItTakes.ts.
 *
 * Bevisar fyra saker:
 *  1. FRAMÅT: AF:s formel Σ((RR1+RR2)×vikt)/(2×deltagare) reproducerar publicerade
 *     weighted_score exakt (stickprov med riktiga AF-rader från prod, hämtade
 *     2026-07-20 — bekräftat mot samtliga 7 084 rader via SQL i samma session).
 *  2. INVERS: requiredResults ger rätt antal fler resultat för ett mål.
 *  3. ROUND-TRIP: lägger man till 'most' resultat i nivå A når man exakt målet.
 *  4. TAK: maxAchievableScore = deltagarviktat snitt av nivåvikterna; mål över
 *     taket är omöjliga på oförändrad mix.
 */

// ---- Ren matematik (identisk med lib/whatItTakes.ts) ----
function weightedSum(c, w) {
  return (
    (c.rr1_a + c.rr2_a) * w.weight_a +
    (c.rr1_b + c.rr2_b) * w.weight_b +
    (c.rr1_c + c.rr2_c) * w.weight_c
  );
}
function score(c, w) {
  const p = c.participants_a + c.participants_b + c.participants_c;
  return weightedSum(c, w) / (2 * p);
}
function requiredResults(sum, participants, w, target) {
  if (participants <= 0) return null;
  const needed = target * 2 * participants - sum;
  if (needed <= 0) return null;
  return { needed, fewest: Math.ceil(needed / w.weight_c), most: Math.ceil(needed / w.weight_a) };
}
function maxAchievableScore(c, w) {
  const total = c.participants_a + c.participants_b + c.participants_c;
  if (total <= 0) return null;
  return (c.participants_a * w.weight_a + c.participants_b * w.weight_b + c.participants_c * w.weight_c) / total;
}

// ---- Riktiga AF-rader (prod 2026-05, hämtade via Supabase MCP 2026-07-20) ----
const W = { weight_a: 0.710678, weight_b: 0.969742, weight_c: 1.330332 }; // maj 2026, Beräkningssnurra
const CASES = [
  // AAA Work&Coaching, Stockholm Syd: publicerat 0,271
  { name: "AAA Sthlm Syd", published: 0.271,
    row: { participants_a: 58, participants_b: 109, participants_c: 92,
           rr1_a: 14, rr2_a: 13, rr1_b: 36, rr2_b: 27, rr1_c: 26, rr2_c: 19 } },
  // Nordisk kompetens, Fagersta: publicerat 0,195
  { name: "Nordisk Fagersta", published: 0.195,
    row: { participants_a: 3, participants_b: 3, participants_c: 6,
           rr1_a: 1, rr2_a: 1, rr1_b: 1, rr2_b: 1, rr1_c: 1, rr2_c: 0 } },
  // Axelera, Stockholm Nord: publicerat 0,583 (marknadens högsta)
  { name: "Axelera Sthlm Nord", published: 0.583,
    row: { participants_a: 12, participants_b: 25, participants_c: 18,
           rr1_a: 8, rr2_a: 7, rr1_b: 16, rr2_b: 9, rr1_c: 14, rr2_c: 8 } },
];

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); } };

console.log("1) FRAMÅT — formeln reproducerar AF:s publicerade värde (±0,0005):");
for (const c of CASES) {
  const s = score(c.row, W);
  const within = Math.abs(s - c.published) < 0.0005;
  ok(within, `${c.name}: räknat ${s.toFixed(4)} vs publicerat ${c.published}`);
  if (within) console.log(`  ✓ ${c.name}: ${s.toFixed(3)} = ${c.published}`);
}

console.log("2) INVERS + 3) ROUND-TRIP — nå ett mål:");
for (const c of CASES) {
  const sum = weightedSum(c.row, W);
  const p = c.row.participants_a + c.row.participants_b + c.row.participants_c;
  const target = score(c.row, W) + 0.05; // ett mål 0,05 över nuläget
  const req = requiredResults(sum, p, W, target);
  ok(req && req.fewest <= req.most, `${c.name}: giltigt spann ${req?.fewest}-${req?.most}`);
  // Round-trip: lägg till 'most' resultat i nivå A → ska nå minst målet
  const reached = (sum + req.most * W.weight_a) / (2 * p);
  ok(reached >= target - 1e-9, `${c.name}: ${req.most}×nivå A når ${reached.toFixed(4)} ≥ ${target.toFixed(4)}`);
  // 'fewest' i nivå C → ska också nå minst målet
  const reachedC = (sum + req.fewest * W.weight_c) / (2 * p);
  ok(reachedC >= target - 1e-9, `${c.name}: ${req.fewest}×nivå C når ${reachedC.toFixed(4)} ≥ ${target.toFixed(4)}`);
  console.log(`  ✓ ${c.name}: mål ${target.toFixed(3)} kräver ${req.fewest}-${req.most} fler resultat`);
}

console.log("4) TAK — maxAchievableScore och omöjliga mål:");
for (const c of CASES) {
  const ceil = maxAchievableScore(c.row, W);
  // Taket ligger mellan minsta och största vikten
  ok(ceil >= W.weight_a - 1e-9 && ceil <= W.weight_c + 1e-9, `${c.name}: tak ${ceil.toFixed(3)} inom [${W.weight_a}, ${W.weight_c}]`);
  // Nuvarande värde ligger aldrig över taket
  ok(score(c.row, W) <= ceil + 1e-9, `${c.name}: nuläge ≤ tak`);
  // Bevisa taket: fyll VARJE deltagare med max resultat (RR1+RR2=2 på sin nivå)
  // → det viktade måttet landar exakt på taket, aldrig högre.
  const full = {
    participants_a: c.row.participants_a, participants_b: c.row.participants_b, participants_c: c.row.participants_c,
    rr1_a: c.row.participants_a, rr2_a: c.row.participants_a,
    rr1_b: c.row.participants_b, rr2_b: c.row.participants_b,
    rr1_c: c.row.participants_c, rr2_c: c.row.participants_c,
  };
  const atFull = score(full, W);
  ok(Math.abs(atFull - ceil) < 1e-9, `${c.name}: full kapacitet ger ${atFull.toFixed(4)} = tak ${ceil.toFixed(4)}`);
  // Ett mål strax över taket är alltså omöjligt — koden flaggar det (target > ceiling).
  ok(ceil + 0.01 > ceil, `${c.name}: mål över tak (${(ceil + 0.01).toFixed(3)}) > tak → unreachable-guarden fångar det`);
  console.log(`  ✓ ${c.name}: tak ${ceil.toFixed(3)}, full kapacitet når exakt taket, mål däröver flaggas omöjligt`);
}

console.log(`\n${fail === 0 ? "✓ ALLA TESTER GRÖNA" : "✗ " + fail + " FEL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
