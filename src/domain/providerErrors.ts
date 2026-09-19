export class ProviderNotConfiguredError extends Error {
  readonly failure = "not_configured" as const;

  constructor(message = "Live Jev is not configured.") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderQuotaError extends Error {
  readonly failure = "quota" as const;

  constructor(message = "Live Jev quota or rate limit was exceeded.") {
    super(message);
    this.name = "ProviderQuotaError";
  }
}
