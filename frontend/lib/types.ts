export interface RomResult {
  id: number;
  dataset_id: string;
  supplier: string;
  delivery_area: string;
  ka_number: string | null;
  participants: number;
  results: number;
  rating: number | null;
  weighted_score: number;
  result_rate: number | null;
  /** null = AF publicerade inte riskkolumnen den perioden */
  risk_of_termination: boolean | null;
  dataset_date: string;
  contract_start_date: string | null;
  active_22_months: boolean | null;
  participants_a: number | null;
  participants_b: number | null;
  participants_c: number | null;
  rr1_a: number | null;
  rr2_a: number | null;
  rr1_b: number | null;
  rr2_b: number | null;
  rr1_c: number | null;
  rr2_c: number | null;
}

export interface Dataset {
  dataset_id: string;
  dataset_source: string;
  file_path: string;
  imported_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  slug: string;
  org_number: string | null;
}

export interface SupplierRating {
  ka_number: string;
  supplier: string;
  delivery_area: string;
  af_region: string | null;
  /** null = "Betyg saknas" i AF:s fil */
  rating: number | null;
  period: string;
}

export interface PeriodWeights {
  period: string;
  weight_a: number;
  weight_b: number;
  weight_c: number;
}

/** En rad i händelseloggen — beräknad ur skillnaden mellan två perioder. */
export interface MarketEvent {
  type: "rating_changed" | "entered" | "left" | "risk_on" | "risk_off";
  period: string;
  prevPeriod: string;
  supplier: string;
  delivery_area: string;
  ka_number: string | null;
  detail: string;
}

/** Serie per avtal (leverantör × område) för trend/jämförelse. */
export interface ContractSeries {
  key: string; // `${supplier} — ${delivery_area}`
  supplier: string;
  delivery_area: string;
  points: { period: string; weighted_score: number | null; rating: number | null }[];
}

export interface Office {
  id: number;
  supplier_name: string;
  supplier_id: number | null;
  adressrad: string | null;
  postnummer: string | null;
  postort: string | null;
  latitude: number;
  longitude: number;
  nyval_tillatet: boolean | null;
}

export interface Municipality {
  kommun: string;
  delivery_area: string;
}

/** Kompakt serie för konstellationsmolnet: ett värde per period (null = fanns ej). */
export interface CloudSeries {
  supplier: string;
  delivery_area: string;
  values: (number | null)[];
}
