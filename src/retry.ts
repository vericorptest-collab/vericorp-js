const RETRYABLE_STATUS = new Set([429, 503]);

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxRetries) {
        return response;
      }

      // Respect Retry-After header if present
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * 2 ** attempt, 10000);

      await sleep(delay);
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxRetries) break;
      await sleep(Math.min(1000 * 2 ** attempt, 10000));
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
