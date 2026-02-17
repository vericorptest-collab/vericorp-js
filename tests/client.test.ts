import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VeriCorp, RateLimitError, InvalidTaxIdError, NotFoundError, TimeoutError, VeriCorpError } from "../src";

const API_KEY = "test-api-key";

function mockFetch(body: unknown, status = 200, headers?: Record<string, string>) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    headers: new Headers(headers),
  });
}

describe("VeriCorp", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("requires apiKey", () => {
    expect(() => new VeriCorp({ apiKey: "" })).toThrow("apiKey is required");
  });

  describe("lookup", () => {
    it("returns company data", async () => {
      const company = {
        tax_id: "PT502011378",
        country: "PT",
        name: "UNIVERSIDADE DO MINHO",
        source: "vies",
        data_quality: "partial",
        cached: true,
        fetched_at: "2026-02-16T20:11:20.736Z",
      };
      globalThis.fetch = mockFetch(company);

      const client = new VeriCorp({ apiKey: API_KEY });
      const result = await client.lookup("PT502011378");

      expect(result.tax_id).toBe("PT502011378");
      expect(result.name).toBe("UNIVERSIDADE DO MINHO");
      expect(globalThis.fetch).toHaveBeenCalledOnce();

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/v1/company/PT502011378");
      expect(init.headers["X-RapidAPI-Key"]).toBe(API_KEY);
      expect(init.headers["X-RapidAPI-Host"]).toBe("vericorp-api.p.rapidapi.com");
    });

    it("supports force_refresh", async () => {
      globalThis.fetch = mockFetch({ tax_id: "PT502011378", name: "Test" });

      const client = new VeriCorp({ apiKey: API_KEY });
      await client.lookup("PT502011378", { forceRefresh: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("force_refresh=true");
    });
  });

  describe("lookupGB", () => {
    it("calls correct endpoint", async () => {
      globalThis.fetch = mockFetch({ tax_id: "GB00445790", name: "Test UK Ltd" });

      const client = new VeriCorp({ apiKey: API_KEY });
      await client.lookupGB("00445790");

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/v1/company/gb/00445790");
    });
  });

  describe("validate", () => {
    it("returns validation result", async () => {
      const validation = {
        tax_id: "PT502011378",
        country: "PT",
        format_valid: true,
        vat_valid: true,
        company_name: "UNIVERSIDADE DO MINHO",
      };
      globalThis.fetch = mockFetch(validation);

      const client = new VeriCorp({ apiKey: API_KEY });
      const result = await client.validate("PT502011378");

      expect(result.format_valid).toBe(true);
      expect(result.vat_valid).toBe(true);
    });
  });

  describe("batch", () => {
    it("sends POST with tax_ids", async () => {
      const batch = { total: 2, successful: 2, results: [] };
      globalThis.fetch = mockFetch(batch);

      const client = new VeriCorp({ apiKey: API_KEY });
      await client.batch(["PT502011378", "DK10150817"]);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("/v1/batch");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ tax_ids: ["PT502011378", "DK10150817"] });
    });
  });

  describe("countries", () => {
    it("returns countries list", async () => {
      const countries = { total: 28, enriched: 8, vat_validation: 28, countries: [] };
      globalThis.fetch = mockFetch(countries);

      const client = new VeriCorp({ apiKey: API_KEY });
      const result = await client.countries();

      expect(result.total).toBe(28);
    });
  });

  describe("health", () => {
    it("returns health status", async () => {
      const health = { status: "healthy", timestamp: "2026-02-17T00:00:00Z", sources: {}, cache: { status: "up" } };
      globalThis.fetch = mockFetch(health);

      const client = new VeriCorp({ apiKey: API_KEY });
      const result = await client.health();

      expect(result.status).toBe("healthy");
    });
  });

  describe("error handling", () => {
    it("throws RateLimitError on 429", async () => {
      globalThis.fetch = mockFetch({ error: "Too many requests", code: "RATE_LIMITED" }, 429);

      const client = new VeriCorp({ apiKey: API_KEY, maxRetries: 0 });
      await expect(client.lookup("PT502011378")).rejects.toThrow(RateLimitError);
    });

    it("throws InvalidTaxIdError on invalid format", async () => {
      globalThis.fetch = mockFetch({ error: "Invalid tax ID format", code: "INVALID_TAX_ID" }, 400);

      const client = new VeriCorp({ apiKey: API_KEY });
      await expect(client.validate("INVALID")).rejects.toThrow(InvalidTaxIdError);
    });

    it("throws NotFoundError on 404", async () => {
      globalThis.fetch = mockFetch({ error: "Not Found", code: "NOT_FOUND" }, 404);

      const client = new VeriCorp({ apiKey: API_KEY });
      await expect(client.lookup("PT000000000")).rejects.toThrow(NotFoundError);
    });

    it("throws VeriCorpError for other errors", async () => {
      globalThis.fetch = mockFetch({ error: "Forbidden", code: "FORBIDDEN" }, 403);

      const client = new VeriCorp({ apiKey: API_KEY });
      await expect(client.lookup("PT502011378")).rejects.toThrow(VeriCorpError);
    });

    it("throws TimeoutError when request times out", async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          if (init.signal?.aborted) return onAbort();
          init.signal?.addEventListener("abort", onAbort);
        });
      });

      const client = new VeriCorp({ apiKey: API_KEY, timeout: 50, maxRetries: 0 });
      await expect(client.lookup("PT502011378")).rejects.toThrow(TimeoutError);
    });
  });

  describe("retry", () => {
    it("retries on 429 and succeeds", async () => {
      const company = { tax_id: "PT502011378", name: "Test" };
      const fn = vi.fn()
        .mockResolvedValueOnce({
          ok: false, status: 429, statusText: "Too Many Requests",
          json: () => Promise.resolve({ error: "Rate limited", code: "RATE_LIMITED" }),
          headers: new Headers({ "Retry-After": "0" }),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200, statusText: "OK",
          json: () => Promise.resolve(company),
          headers: new Headers(),
        });
      globalThis.fetch = fn;

      const client = new VeriCorp({ apiKey: API_KEY, maxRetries: 1 });
      const result = await client.lookup("PT502011378");

      expect(result.name).toBe("Test");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("retries on 503 and succeeds", async () => {
      const company = { tax_id: "DK10150817", name: "Test DK" };
      const fn = vi.fn()
        .mockResolvedValueOnce({
          ok: false, status: 503, statusText: "Service Unavailable",
          json: () => Promise.resolve({ error: "Budget exhausted", code: "BUDGET_EXHAUSTED" }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200, statusText: "OK",
          json: () => Promise.resolve(company),
          headers: new Headers(),
        });
      globalThis.fetch = fn;

      const client = new VeriCorp({ apiKey: API_KEY, maxRetries: 1 });
      const result = await client.lookup("DK10150817");

      expect(result.name).toBe("Test DK");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("custom options", () => {
    it("supports custom baseUrl", async () => {
      globalThis.fetch = mockFetch({ status: "healthy" });

      const client = new VeriCorp({ apiKey: API_KEY, baseUrl: "https://custom.api.com" });
      await client.health();

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toMatch(/^https:\/\/custom\.api\.com/);
    });

    it("supports custom host", async () => {
      globalThis.fetch = mockFetch({ status: "healthy" });

      const client = new VeriCorp({ apiKey: API_KEY, host: "custom.host.com" });
      await client.health();

      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(init.headers["X-RapidAPI-Host"]).toBe("custom.host.com");
    });
  });
});
