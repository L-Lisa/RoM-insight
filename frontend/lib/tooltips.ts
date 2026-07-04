/**
 * Tvålagersförklaringar (K4) — skrivs en gång, delas med systersajten.
 * Lager 1: AF:s formella definition (citerad/parafraserad med källa).
 * Lager 2: "På ren svenska" — klarspråk i Lisas voice. Data dömer, inte orden.
 */
export interface TwoLayerText {
  af: string;
  plain: string;
}

export const explain: Record<string, TwoLayerText> = {
  betyg: {
    af: "AF: \"Betygen visar hur väl en leverantör har lyckats med att stödja sina deltagare till arbete eller studier, jämfört med andra leverantörer och med hänsyn till deltagarnas avstånd till arbetsmarknaden.\" Skala 1–4 där 4 är högst. (Betygsmodellen, Arbetsförmedlingen)",
    plain: "På ren svenska: hur bra leverantören fått ut folk i jobb eller studier, jämfört med andra. Fyra stjärnor är bäst. Betyget tar viss hänsyn till hur svår grupp leverantören jobbar med.",
  },
  viktatResultat: {
    af: "AF: \"Resultatmåttet är ett samlat mått som bygger på de resultat och deltagare som en leverantör haft under mätperioden. Det tar hänsyn till att deltagare står olika långt från arbetsmarknaden, utifrån nivåerna A, B och C.\" (Resultatuppföljningen, Arbetsförmedlingen)",
    plain: "På ren svenska: hur stor andel av deltagarna som fick jobb eller började plugga. Viktningen mildrar effekten av svåra grupper — men den tar inte bort den helt, och den tar ingen hänsyn till hur arbetsmarknaden ser ut där du bor.",
  },
  ejBetygsatt: {
    af: "AF: för att en leverantör ska få betyg krävs minst 18 deltagare under mätperioden och minst 12 månaders verksamhet.",
    plain: "På ren svenska: \"Betyg saknas\" betyder inte dåligt — det betyder att avtalet är för nytt eller för litet för att betygsättas ännu. Det gäller ungefär var fjärde avtal.",
  },
  riskzon: {
    af: "AF häver ett avtal vid resultatöversyn om leverantören (1) fått betyg 1 eller saknar betyg, (2) har viktat resultatmått under 0,2, och (3) inte presterat väl vid två efterföljande uppföljningar. Endast avtal aktiva i minst 22 månader omfattas. (Kvalitetsvillkor Rusta och matcha)",
    plain: "På ren svenska: riskzonen är en informativ beräkning utifrån Arbetsförmedlingens publicerade villkor — den simulerar inte myndighetens beslut. AF publicerar dessutom sin egen riskflagga bara vissa perioder.",
  },
  nivaABC: {
    af: "AF delar in deltagare i nivå A, B och C utifrån bedömt avstånd till arbetsmarknaden, där C står längst ifrån. Resultat viktas med periodens vikter per nivå.",
    plain: "På ren svenska: en deltagare som står långt från arbetsmarknaden väger tyngre i resultatmåttet. Vikterna ändras varje period och läses direkt ur AF:s fil.",
  },
  leveransomrade: {
    af: "AF: det geografiska område där leverantören har avtal att leverera tjänsten.",
    plain: "På ren svenska: området där leverantören får ta emot deltagare. En leverantör kan ha avtal i många områden — och prestera olika i olika områden.",
  },
  riskflagga: {
    af: "AF: kolumnen RISKERAR HÄVNING markerar avtal som riskerar att inte uppnå kraven på kvalitet i tjänsten. Kolumnen publiceras inte varje period.",
    plain: "På ren svenska: en varningsflagga från AF själva. Saknas flaggan för en period betyder det att AF inte publicerade den då — inte att risken är noll.",
  },
  utgangen: {
    af: "Avtalet finns inte längre i Arbetsförmedlingens statistikfiler.",
    plain: "På ren svenska: avtalet har lämnat statistiken. Varför — hävning, egen uppsägning eller annat — framgår inte av AF:s filer, så det påstår vi inget om.",
  },
  percentil: {
    af: "Percentilen är RoM Insights beräkning: avtalets viktade resultatmått rankat mot samtliga avtal i samma period. Detta är inte ett AF-mått.",
    plain: "På ren svenska: \"bättre än 78 % av alla avtal\" säger mer än \"0,32\". Vår beräkning, gjord på AF:s siffror — metoden finns beskriven på metodsidan.",
  },
  hallbarhet: {
    af: "RR1 = första godkända resultatredovisningen (deltagaren fick arbete eller började studera). RR2 = godkänd uppföljningsredovisning för samma placering, senare i tid.",
    plain: "På ren svenska: hur stor andel av de första resultaten som följts av ett godkänt uppföljningsresultat i samma mätfönster — grovt: håller jobben i sig? RoM Insights beräkning (RR2 ÷ RR1) på AF:s siffror. Sena placeringar hinner inte alltid få sin uppföljning inom fönstret, så kvoten är en underskattning snarare än en överskattning.",
  },
  deltagarmix: {
    af: "AF delar in deltagare i nivå A, B och C efter bedömt avstånd till arbetsmarknaden, där C står längst ifrån.",
    plain: "På ren svenska: vilka grupper leverantören faktiskt jobbar med. En hög andel C betyder ett svårare uppdrag — det är därför viktningen finns. Andelarna är AF:s egna deltagartal per nivå.",
  },
};

/** Bakåtkompatibla en-lagers-texter (används där ytan är för liten för två lager). */
export const tooltips = {
  leveransomrade: explain.leveransomrade.plain,
  viktatResultat: explain.viktatResultat.plain,
  betyg: explain.betyg.plain,
  riskHavning: explain.riskflagga.plain,
  resultattakt:
    "Antal godkända resultat (RR1 — deltagaren fick arbete eller började studera) delat med antal deltagare i mätperioden.",
};
