/**
 * Live domain verification — CareerSasa must never store invented / dead-end domains.
 *
 * Outcomes:
 * - alive: hostname responded like a real site
 * - dead: NXDOMAIN / clear not-found (safe to reject or clear)
 * - unreachable: timeout / reset / blocked from this network (inconclusive —
 *   do NOT treat as proof the domain is fake, and do NOT clear existing data)
 *
 * Server-only (uses fetch with timeouts).
 */

const UA =
  'Mozilla/5.0 (compatible; CareerSasaBot/1.0; +https://careersasa.co.ke)';

/** Status codes that still prove a host exists (bot-blocked / method-not-allowed). */
const ALIVE_STATUSES = new Set([401, 403, 405, 429, 503]);

export type DomainLiveness = 'alive' | 'dead' | 'unreachable';

export function normalizeHostname(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  value = value.split('/')[0].split('?')[0].replace(/\.$/, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    return null;
  }
  return value;
}

type ProbeResult =
  | { kind: 'http'; status: number }
  | { kind: 'error'; code: string };

async function probeUrl(url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });
    return { kind: 'http', status: res.status };
  } catch (err: unknown) {
    const anyErr = err as { cause?: { code?: string }; code?: string; name?: string; message?: string };
    const code =
      anyErr?.cause?.code ||
      anyErr?.code ||
      (anyErr?.name === 'TimeoutError' || /aborted|timeout/i.test(String(anyErr?.message || ''))
        ? 'ETIMEDOUT'
        : 'ERROR');
    return { kind: 'error', code: String(code) };
  }
}

function isAliveStatus(status: number): boolean {
  if (status >= 200 && status < 400) return true;
  if (ALIVE_STATUSES.has(status)) return true;
  return false;
}

/** DNS / host-not-found style failures → domain is not real. */
function isDeadError(code: string): boolean {
  return /ENOTFOUND|EAI_AGAIN|ERR_NAME_NOT_RESOLVED|getaddrinfo/i.test(code);
}

/**
 * Classify whether a hostname looks like a real live site from this network.
 */
export async function checkDomainLiveness(
  domain: string | null | undefined
): Promise<DomainLiveness> {
  const host = normalizeHostname(domain);
  if (!host) return 'dead';

  const hosts = host.startsWith('www.')
    ? [host, host.slice(4)]
    : [host, `www.${host}`];

  let sawUnreachable = false;
  let sawHttpNotFound = false;

  for (const h of hosts) {
    for (const protocol of ['https', 'http'] as const) {
      const result = await probeUrl(`${protocol}://${h}/`);
      if (result.kind === 'http') {
        if (isAliveStatus(result.status)) return 'alive';
        if (result.status === 404 || result.status === 410) {
          sawHttpNotFound = true;
          continue;
        }
        // Other 4xx/5xx from a responding host → treat as alive-ish (host exists)
        if (result.status >= 400 && result.status < 600) return 'alive';
      } else {
        if (isDeadError(result.code)) continue; // try www / other protocol
        // ECONNRESET, ETIMEDOUT, cert errors, etc. — host may exist but block us
        sawUnreachable = true;
      }
    }
  }

  if (sawUnreachable) return 'unreachable';
  if (sawHttpNotFound) return 'dead';
  return 'dead';
}

/** True only when we positively confirmed the host responds. */
export async function verifyDomainAlive(
  domain: string | null | undefined
): Promise<boolean> {
  return (await checkDomainLiveness(domain)) === 'alive';
}

/**
 * Return the first candidate domain that is positively alive, or null.
 * Never invents domains — only checks provided candidates.
 */
export async function firstLiveDomain(
  candidates: Array<string | null | undefined>
): Promise<string | null> {
  const seen = new Set<string>();
  for (const raw of candidates) {
    const host = normalizeHostname(raw);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    if (await verifyDomainAlive(host)) return host;
  }
  return null;
}
