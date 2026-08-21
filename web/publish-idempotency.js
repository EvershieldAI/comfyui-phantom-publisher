const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalize(value[key])]),
  );
};

export const fingerprintPublishPayload = async (payload) => {
  const encoded = new TextEncoder().encode(JSON.stringify(canonicalize(payload)));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const selectPendingIdempotencyKey = (
  stored,
  manifestFingerprint,
  createKey = () => crypto.randomUUID(),
) => {
  try {
    const pending = JSON.parse(stored ?? 'null');
    if (
      pending &&
      typeof pending.idempotencyKey === 'string' &&
      pending.manifestFingerprint === manifestFingerprint
    ) {
      return pending.idempotencyKey;
    }
  } catch {
    // Legacy values stored only the raw key and cannot prove content identity.
  }
  return createKey();
};
