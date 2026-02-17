export class VeriCorpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "VeriCorpError";
  }
}

export class RateLimitError extends VeriCorpError {
  constructor(message = "Too many requests") {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}

export class InvalidTaxIdError extends VeriCorpError {
  constructor(message = "Invalid tax ID format") {
    super(message, "INVALID_TAX_ID", 400);
    this.name = "InvalidTaxIdError";
  }
}

export class NotFoundError extends VeriCorpError {
  constructor(message = "Company not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class TimeoutError extends VeriCorpError {
  constructor(message = "Request timed out") {
    super(message, "TIMEOUT", 0);
    this.name = "TimeoutError";
  }
}
