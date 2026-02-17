export interface CompanyResponse {
  tax_id: string;
  country: string;
  name: string;
  address?: Address;
  legal_form?: string;
  status?: string;
  incorporation_date?: string;
  activity_code?: string;
  activity_description?: string;
  capital?: number;
  capital_currency?: string;
  contacts?: Contacts;
  directors?: Director[];
  psc?: PersonWithSignificantControl[];
  vat_valid?: boolean;
  vat_consultation_number?: string;
  source: DataSource;
  data_quality: DataQuality;
  cached: boolean;
  stale?: boolean;
  data_age_days?: number;
  fetched_at: string;
}

export interface Address {
  street?: string;
  city?: string;
  postal_code?: string;
  region?: string;
  country: string;
}

export interface Contacts {
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
}

export interface Director {
  name: string;
  role?: string;
  appointed_on?: string;
  resigned_on?: string;
}

export interface PersonWithSignificantControl {
  name: string;
  natures_of_control?: string[];
  notified_on?: string;
}

export type DataSource =
  | "vies"
  | "nifpt"
  | "companies_house"
  | "cvr"
  | "brreg"
  | "prh"
  | "ares"
  | "ariregister"
  | "krs";

export type DataQuality = "full" | "partial" | "vies_only";

export interface ValidationResponse {
  tax_id: string;
  country: string;
  format_valid: boolean;
  vat_valid?: boolean;
  company_name?: string;
  consultation_number?: string;
}

export interface CountriesResponse {
  total: number;
  enriched: number;
  vat_validation: number;
  countries: CountryInfo[];
}

export interface CountryInfo {
  code: string;
  name: string;
  enriched: boolean;
  source?: string;
  vat_validation: boolean;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  sources: Record<string, SourceHealth>;
  cache: { status: "up" | "down" };
}

export interface SourceHealth {
  status: "up" | "down" | "unknown";
  latency_ms?: number;
  budget_remaining?: number;
}

export interface BatchResponse {
  total: number;
  successful: number;
  results: (CompanyResponse | BatchError)[];
}

export interface BatchError {
  tax_id: string;
  error: string;
  code: string;
}

export interface ApiErrorBody {
  error: string;
  code: string;
}

export interface VeriCorpOptions {
  apiKey: string;
  host?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
