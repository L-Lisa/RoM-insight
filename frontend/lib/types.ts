export interface RomResult {
  id: number;
  dataset_id: string;
  supplier: string;
  delivery_area: string;
  participants: number;
  results: number;
  rating: number | null;
  weighted_score: number;
  result_rate: number | null;
  risk_of_termination: boolean;
  dataset_date: string;
}

export interface Dataset {
  dataset_id: string;
  dataset_source: string;
  file_path: string;
  imported_at: string;
}
