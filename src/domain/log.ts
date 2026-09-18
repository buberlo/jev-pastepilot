const SECRET_NAME = /api[_-]?key|authorization|password|secret|token|typesafe/i;
const SECRET_VALUE = /TYPESAFE_API_KEY/i;

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return SECRET_VALUE.test(value) ? "[redacted]" : value;
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SECRET_NAME.test(key) || key === "input" || key === "text" || key === "clipboard") {
        continue;
      }
      next[key] = redact(nested);
    }
    return next;
  }
  return value;
}

/**
 * Operational log only: ids, provider, outcome, elapsed time.
 * Never logs pasted content or TYPESAFE_API_KEY.
 */
export function logOperational(event: string, fields: Record<string, unknown> = {}): void {
  const safe = redact({ event, ...fields }) as Record<string, unknown>;
  console.info("[pastepilot]", safe);
}

export function looksLikeSecretField(name: string): boolean {
  return SECRET_NAME.test(name);
}
