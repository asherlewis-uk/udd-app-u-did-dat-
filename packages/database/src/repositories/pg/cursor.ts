export const DEFAULT_PAGE_LIMIT = 25;

interface CursorPayload {
  id: string;
  created_at: string;
}

export function encodeCursor(id: string, createdAt: string): string {
  const payload: CursorPayload = { id, created_at: createdAt };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(raw) as CursorPayload;
  } catch {
    throw new Error('Invalid pagination cursor');
  }
}

/**
 * Builds the WHERE clause fragment for keyset pagination.
 * Assumes descending order: (created_at DESC, id DESC).
 * @param cursor   Decoded cursor (or null for first page)
 * @param params   Already-bound params ($1, $2, …) before the cursor params
 * @returns        { clause, params } — clause uses $N placeholders; params is the full array
 */
export function buildCursorClause(
  cursor: { id: string; created_at: string } | null,
  existingParams: unknown[],
): { clause: string; params: unknown[] } {
  if (!cursor) {
    return { clause: '', params: [...existingParams] };
  }

  const base = existingParams.length;
  // Keyset: rows where (created_at, id) is strictly less than the cursor
  const clause = `AND (created_at < $${base + 1} OR (created_at = $${base + 1} AND id < $${base + 2}))`;
  const params = [...existingParams, cursor.created_at, cursor.id];
  return { clause, params };
}
