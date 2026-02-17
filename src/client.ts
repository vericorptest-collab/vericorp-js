import type {
  VeriCorpOptions,
  CompanyResponse,
  ValidationResponse,
  BatchResponse,
  CountriesResponse,
  HealthResponse,
  ApiErrorBody,
} from "./types";
import {
  VeriCorpError,
  RateLimitError,
  InvalidTaxIdError,
  NotFoundError,
  TimeoutError,
} from "./errors";
import { fetchWithRetry } from "./retry";

const DEFAULT_HOST = "vericorp-api.p.rapidapi.com";
const DEFAULT_BASE_URL = "https://vericorp-api.p.rapidapi.com";
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_RETRIES = 2;

export class VeriCorp {
  private readonly apiKey: string;
  private readonly host: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: VeriCorpOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");
    this.apiKey = options.apiKey;
    this.host = options.host ?? DEFAULT_HOST;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async lookup(taxId: string, options?: { forceRefresh?: boolean }): Promise<CompanyResponse> {
    const params = options?.forceRefresh ? "?force_refresh=true" : "";
    return this.request<CompanyResponse>(`/v1/company/${encodeURIComponent(taxId)}${params}`);
  }

  async lookupGB(companyNumber: string, options?: { forceRefresh?: boolean }): Promise<CompanyResponse> {
    const params = options?.forceRefresh ? "?force_refresh=true" : "";
    return this.request<CompanyResponse>(`/v1/company/gb/${encodeURIComponent(companyNumber)}${params}`);
  }

  async validate(taxId: string): Promise<ValidationResponse> {
    return this.request<ValidationResponse>(`/v1/validate/${encodeURIComponent(taxId)}`);
  }

  async batch(taxIds: string[]): Promise<BatchResponse> {
    return this.request<BatchResponse>("/v1/batch", {
      method: "POST",
      body: JSON.stringify({ tax_ids: taxIds }),
    });
  }

  async countries(): Promise<CountriesResponse> {
    return this.request<CountriesResponse>("/v1/countries");
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/v1/health");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetchWithRetry(
        url,
        {
          ...init,
          signal: controller.signal,
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.host,
            "Content-Type": "application/json",
            ...init?.headers,
          },
        },
        this.maxRetries,
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({
          error: response.statusText,
          code: "UNKNOWN",
        }))) as ApiErrorBody;

        throw this.mapError(response.status, body);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof VeriCorpError) throw err;
      if ((err as Error).name === "AbortError") throw new TimeoutError();
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private mapError(status: number, body: ApiErrorBody): VeriCorpError {
    switch (body.code) {
      case "RATE_LIMITED":
        return new RateLimitError(body.error);
      case "INVALID_TAX_ID":
        return new InvalidTaxIdError(body.error);
      case "NOT_FOUND":
        return new NotFoundError(body.error);
      default:
        return new VeriCorpError(body.error, body.code, status);
    }
  }
}
