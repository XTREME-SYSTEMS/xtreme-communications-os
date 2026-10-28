// ── Unified authorization gate for privileged backend functions ──
// Every function that touches spend, money, or data goes through this.
//
// Accepts, in order:
//   1. A signed-in app user session (portal + dashboard calls)
//   2. A valid API key — Bearer token, x-api-key header, or body.api_key
//      matched against ApiKey.key_value or ApiKey.token_hash (hashed keys)
//
// Fails closed: no identity → 401. Unknown key → 403.

const encoder = new TextEncoder();

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface AuthOk {
  ok: true;
  userId: string | null;
  via: 'session' | 'api_key';
  apiKey?: any;
}

export interface AuthFail {
  ok: false;
  response: Response;
}

export interface RequireAuthOptions {
  /** Restrict session callers to these roles (e.g. ['admin']). */
  roles?: string[];
  /** Skip API-key acceptance when the caller must be a human session. */
  sessionOnly?: boolean;
}

export async function requireAuth(
  base44: any,
  req: Request,
  options: RequireAuthOptions = {},
): Promise<AuthOk | AuthFail> {
  // ── 1. Signed-in user session ──
  try {
    const user = await base44.auth.me();
    if (user?.id) {
      if (options.roles && !options.roles.includes(user.role)) {
        return {
          ok: false,
          response: Response.json({ error: 'Forbidden — insufficient role' }, { status: 403 }),
        };
      }
      return { ok: true, userId: user.id, via: 'session' };
    }
  } catch (_) {
    // No session — fall through to API key
  }

  if (options.sessionOnly) {
    return {
      ok: false,
      response: Response.json({ error: 'A signed-in user session is required' }, { status: 401 }),
    };
  }

  // ── 2. API key ──
  let bodyKey = '';
  try {
    const clone = req.clone();
    const parsed = await clone.json().catch(() => null);
    if (parsed && typeof parsed.api_key === 'string') bodyKey = parsed.api_key;
  } catch (_) {
    // Body not JSON or already consumed — header auth still applies
  }

  const presented = (
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() ||
    (req.headers.get('x-api-key') || '').trim() ||
    bodyKey.trim()
  );

  if (!presented) {
    return {
      ok: false,
      response: Response.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const hashed = await sha256Hex(presented);
  const [byValue, byHash] = await Promise.all([
    base44.asServiceRole.entities.ApiKey.filter({ key_value: presented, status: 'active' }).catch(() => []),
    base44.asServiceRole.entities.ApiKey.filter({ token_hash: hashed, status: 'active' }).catch(() => []),
  ]);
  const match = (byHash && byHash[0]) || (byValue && byValue[0]);

  if (!match) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid API key' }, { status: 403 }),
    };
  }

  // Track use without blocking the request
  base44.asServiceRole.entities.ApiKey
    .update(match.id, { last_used_at: new Date().toISOString() })
    .catch(() => {});

  return { ok: true, userId: match.user_id || null, via: 'api_key', apiKey: match };
}