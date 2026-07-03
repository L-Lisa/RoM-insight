import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/**
 * Storycards (kravprofil §3): varje delbar vy får ett OG-kort med källa + datum.
 * Används via ?title=…&kpi=…&sub=…&period=… — LinkedIn/X renderar kortet
 * automatiskt när en länk delas. Samma mörka designtokens som sajten.
 */

export const runtime = "edge";

const BG = "#0b101c";
const CARD = "#141b2d";
const LINE = "#232d45";
const TEXT = "#e9edf6";
const DIM = "#9aa5bd";
const ACCENT = "#7c96f5";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const title = (p.get("title") ?? "RoM Insight").slice(0, 90);
  const kpi = (p.get("kpi") ?? "").slice(0, 24);
  const sub = (p.get("sub") ?? "Statistik och trender för Rusta och matcha").slice(0, 140);
  const period = (p.get("period") ?? "").slice(0, 30);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: TEXT }}>
            RoM&nbsp;<span style={{ color: ACCENT }}>Insight</span>
          </div>
          {period && (
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: DIM,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {period}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            background: CARD,
            border: `1px solid ${LINE}`,
            borderRadius: 24,
            padding: 48,
            marginTop: 32,
          }}
        >
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{title}</div>
          {kpi && (
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 24 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: ACCENT }}>{kpi}</div>
            </div>
          )}
          <div style={{ display: "flex", fontSize: 26, color: DIM, marginTop: kpi ? 8 : 24, lineHeight: 1.4 }}>{sub}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 20, color: DIM }}>
          <div style={{ display: "flex" }}>Data: Arbetsförmedlingen · varje siffra spårbar till källfilen</div>
          <div style={{ display: "flex" }}>rominsight</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
