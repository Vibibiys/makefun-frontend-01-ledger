// format.js — the small print: escaping, money, dates, countdowns.
// Every view builds HTML as strings, so anything that arrives from the API
// passes through esc() on its way into the page.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Make a value safe to place inside HTML markup or an attribute. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** "$737" for whole amounts, "$147.46" when there are cents. */
export function usd(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || typeof n !== 'number' || Number.isNaN(n)) return '—';
  const whole = Number.isInteger(n);
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A count with thousands separators: 1234 -> "1,234". */
export function tally(n) {
  return n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US');
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

/** "17 Nov 2026, 12:30 UTC" — pinned to UTC so a deadline reads alike worldwide. */
export function stamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const text = d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
  return `${text} UTC`;
}

/** "17 Nov 2026" where the hour would only be noise. */
export function day(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * How long until an ISO moment, as { label, gone }:
 * "3d 4h left", "5h 12m left", "42m left", "<1m left", and once it passes,
 * { gone: true, label: "closed 2d ago" }.
 */
export function countdown(iso, now = Date.now()) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return { label: '—', gone: false };
  const gap = end - now;
  const span = Math.abs(gap);
  const d = Math.floor(span / DAY_MS);
  const h = Math.floor((span % DAY_MS) / HOUR_MS);
  const m = Math.floor((span % HOUR_MS) / MIN_MS);
  const words = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m';
  return gap >= 0 ? { label: `${words} left`, gone: false } : { label: `closed ${words} ago`, gone: true };
}

/** Win rates travel in millionths (956066); show them as "95.6%". */
export function ratePct(micro) {
  return micro == null ? '—' : `${(Number(micro) / 10_000).toFixed(1)}%`;
}

/** A byte count the way a person reads it: "812 B", "37 KB", "1.20 MB". */
export function sizeOf(bytesCount) {
  if (bytesCount == null) return '—';
  if (bytesCount < 1024) return `${bytesCount} B`;
  if (bytesCount < 1024 * 1024) return `${Math.round(bytesCount / 1024)} KB`;
  return `${(bytesCount / 1_048_576).toFixed(2)} MB`;
}

/**
 * An <img> tag for a picture the API points at. make.fun serves its avatars
 * and entry images with Cross-Origin-Resource-Policy: same-origin, so an
 * image on make.fun itself only loads with crossorigin="anonymous" set
 * before its src; other origins keep their own policy.
 */
export function picture(url, cls, alt) {
  if (!url) return '';
  const abs = url.startsWith('/') ? `https://make.fun${url}` : url;
  const cors = abs.startsWith('https://make.fun/') ? ' crossorigin="anonymous"' : '';
  return `<img class="${cls}" src="${esc(abs)}" alt="${esc(alt)}" loading="lazy"${cors}>`;
}
