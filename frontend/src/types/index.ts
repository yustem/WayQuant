// ============================================================================
// FAIR Parameter Types
// ============================================================================
export interface FairParams {
  lefMin: number;
  lefMode: number;
  lefMax: number;
  lefGamma: number;
  plmMin: number;
  plmMode: number;
  plmMax: number;
  plmGamma: number;
  slefProb: number;
  slmMin: number;
  slmMode: number;
  slmMax: number;
  riskAppetite: number;
}

// ============================================================================
// NIST Control Types
// ============================================================================
export interface NistControl {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  descRu: string;
  descEn: string;
  annualCost: number;
  lefReduction: number;
  plmReduction: number;
  slmReduction: number;
  enabled: boolean;
}

// ============================================================================
// Simulation Result Types (mirrors FastAPI response schema)
// ============================================================================
export interface LecPoint {
  loss: number;
  prob: number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  bin_mid: number;
  count: number;
  density_pct: number;
}

export interface PercentileBreakdown {
  percentile: number;
  total: number;
  primary: number;
  secondary: number;
  exceed_prob: number;
}

export interface ScenarioMetrics {
  iterations: number;
  compute_time_ms: number;
  ale: number;
  cyber_var_95: number;
  cyber_var_99: number;
  tail_cvar_99: number;
  zero_loss_prob_pct: number;
  lec_curve: LecPoint[];
  histogram_bins: HistogramBin[];
  percentiles: PercentileBreakdown[];
}

export interface GovernanceMetrics {
  annual_control_spend: number;
  prevented_annual_loss: number;
  net_benefit: number;
  rosi_percentage: number;
  sec_materiality_exceed_prob: number;
}

export interface SimulationResponse {
  metadata: Record<string, unknown>;
  baseline: ScenarioMetrics;
  residual: ScenarioMetrics;
  governance: GovernanceMetrics;
}

// ============================================================================
// API Request Types
// ============================================================================
export interface ControlPayload {
  id: string;
  annual_cost: number;
  lef_reduction: number;
  plm_reduction: number;
  slm_reduction: number;
  enabled: boolean;
}

export interface SimulationRequest {
  lef_min: number;
  lef_mode: number;
  lef_max: number;
  lef_gamma: number;
  plm_min: number;
  plm_mode: number;
  plm_max: number;
  plm_gamma: number;
  slef_prob: number;
  slm_min: number;
  slm_mode: number;
  slm_max: number;
  sec_materiality_threshold: number;
  iterations: number;
  random_seed: number;
  controls: ControlPayload[];
}

// ============================================================================
// App State Types
// ============================================================================
export type TabId = 'input' | 'simulation' | 'controls' | 'export';
export type LangCode = 'ru' | 'en';
export type CurrencyCode = 'USD' | 'EUR';
export type AssetKey = 'payment_gw' | 'cloud_dwh' | 'swift_node' | 'iam_dir';
export type ThreatKey = 'ransomware' | 'exfiltration' | 'ddos' | 'supply_chain';
