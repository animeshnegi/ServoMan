const SENSITIVE_KEYS = /pass(word)?|secret|token|api[_-]?key|private[_-]?key|credential|authorization|smtp.*(pass|secret)|database.*(pass|url)/i;

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactValue(item);
  }
  return out;
}

export function redactForAudit(value: unknown) {
  return JSON.stringify(redactValue(value)).slice(0, 4000);
}
