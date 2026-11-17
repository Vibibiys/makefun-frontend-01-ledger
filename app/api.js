// api.js — the only door to make.fun's public API.
//
// The API is read-only and open to any origin:
//   GET https://make.fun/api/...        (its OpenAPI: /api/openapi.json)
//
// Its ETags turn over with the minute, which this module turns into an
// advantage: answers are kept in memory, a copy younger than FRESH_FOR is
// served without touching the network, and an older copy is revalidated with
// If-None-Match — a 304 renews it for the price of a header round trip.
// Asking for the same path twice at once shares one request.

const ORIGIN = 'https://make.fun/api';
const FRESH_FOR = 45_000; // ms; just under the API's one-minute ETag life

const store = new Map(); // path -> { tag, body, at }
const flying = new Map(); // path -> Promise<body>

export function apiGet(path) {
  const held = store.get(path);
  if (held && Date.now() - held.at < FRESH_FOR) return Promise.resolve(held.body);
  const shared = flying.get(path);
  if (shared) return shared;

  const job = (async () => {
    const headers = held?.tag ? { 'If-None-Match': held.tag } : {};
    const res = await fetch(ORIGIN + path, { headers });
    if (res.status === 304 && held) {
      held.at = Date.now();
      return held.body;
    }
    if (!res.ok) throw new Error(`The make.fun API answered ${res.status} for ${path}`);
    const body = await res.json();
    store.set(path, { tag: res.headers.get('ETag'), body, at: Date.now() });
    return body;
  })();

  flying.set(path, job);
  return job.finally(() => flying.delete(path));
}

const slug = encodeURIComponent;

/** The board's first page: every public bounty, newest activity first. */
export const boardPage = () => apiGet('/competitions?activity=times');

/** The board's later pages, followed by cursor. */
export const boardNext = (cursor) => apiGet(`/competitions?activity=times&cursor=${slug(cursor)}`);

/** One bounty in full: summary, description, rules and its rewards now. */
export const bountyDetail = (name) => apiGet(`/competitions/${slug(name)}`);

/** One bounty's leaderboard, with the columns its scoring declares. */
export const bountyBoard = (name) => apiGet(`/competitions/${slug(name)}/leaderboard`);

/** One account's public profile: its record and all of its entries. */
export const profileOf = (handle) => apiGet(`/profiles/${slug(handle)}`);
