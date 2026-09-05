export type ErrorCode =
  | "validation_error"
  | "not_found"
  | "upstream_error"
  | "billing_error"
  | "internal_error";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 400, "validation_error", options);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 404, "not_found", options);
  }
}

/** Open Food Facts failed or returned something we cannot use. */
export class UpstreamError extends AppError {
  /** Transient failures (5xx, network drops) are worth one more attempt. */
  readonly isRetryable: boolean;

  constructor(message: string, options?: ErrorOptions & { isRetryable?: boolean }) {
    super(message, 502, "upstream_error", options);
    this.isRetryable = options?.isRetryable ?? false;
  }
}

export class BillingError extends AppError {
  constructor(message: string, statusCode = 400, options?: ErrorOptions) {
    super(message, statusCode, "billing_error", options);
  }
}
