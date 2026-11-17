// views/leaderboard.js — a bounty's leaderboard,
// route #/bounty/<slug>/leaderboard.
//
// The table's columns are the ones the API declares for this bounty's own
// scoring — win rates arrive in millionths and are shown as percents, sizes
// as KB, a valid flag as words. Rows arrive in rank order and are appended
// fifty at a time into the same table; the filter narrows by entrant or
// entry title without a rebuild of anything but the body. Entrants link
// through to their profiles.

import { bountyBoard } from '../api.js';
import { esc, picture, ratePct, sizeOf, tally } from '../format.js';

const ROWS_PAGE = 50;

function cellText(col, entry) {
  const raw = entry.values ? entry.values[col.key] : null;
  if (raw == null) return esc(entry.display?.[col.key] ?? '—');
  if ((col.source || '').includes('_micro')) return ratePct(raw);
  if (col.key === 'bytes') return sizeOf(raw);
  if (col.key === 'valid') return raw ? '✓ valid' : 'refused';
  return esc(entry.display?.[col.key] ?? raw);
}

export async function showLeaderboard(app, slug) {
  const data = await bountyBoard(slug);
  const comp = data.competition || {};
  document.title = `Leaderboard — ${comp.title || slug} — make.fun bounties`;
  const cols = (data.columns || []).filter((c) => !c.hidden);
  const all = data.entries || [];
  const judged = all.some((e) => e.judge && e.judge.matches);

  app.innerHTML = `
    <p class="crumbs"><a href="#/bounty/${esc(slug)}">← ${esc(comp.title || slug)}</a></p>
    <header class="page-head">
      <h1 tabindex="-1">${esc(data.title || 'Leaderboard')}</h1>
      <p class="lede">${esc(comp.title || '')} · ${esc(data.phase?.title || '')} phase ·
      ${tally(all.length)} ranked entries, best first. Win rates carry a 90% interval; places follow the rate.</p>
    </header>
    <div class="filters">
      <label>Filter entrants <input id="f" type="search" placeholder="handle or entry title…" autocomplete="off"></label>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th scope="col">#</th><th scope="col">Entrant</th>
        ${cols.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('')}
        ${judged ? '<th scope="col">W–D–L</th>' : ''}
      </tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
    <p><button id="more" type="button" class="btn btn-quiet">Show more entries</button></p>`;

  const tbody = app.querySelector('#rows');
  const more = app.querySelector('#more');
  const filter = app.querySelector('#f');
  let current = all;
  let shown = 0;

  function rowHtml(e) {
    const who = e.handle ? `<a href="#/u/${esc(e.handle)}">@${esc(e.handle)}</a>` : '—';
    const record = judged
      ? `<td class="nowrap">${e.judge ? `${e.judge.wins}–${e.judge.draws}–${e.judge.losses}` : '—'}</td>`
      : '';
    return `<tr>
      <td class="rank-cell">${e.rank ?? '—'}</td>
      <td><div class="entrant-cell">${picture(e.image, 'avatar', '')}<div><strong>${who}</strong><p>${esc(e.title || '')}</p></div></div></td>
      ${cols.map((c) => `<td>${cellText(c, e)}</td>`).join('')}
      ${record}
    </tr>`;
  }

  function paintMore() {
    const chunk = current.slice(shown, shown + ROWS_PAGE);
    tbody.insertAdjacentHTML('beforeend', chunk.map(rowHtml).join(''));
    shown += chunk.length;
    more.hidden = shown >= current.length;
    if (current.length === 0) tbody.innerHTML = '<tr><td colspan="99">No entries match.</td></tr>';
  }

  filter.addEventListener('input', () => {
    const term = filter.value.trim().toLowerCase();
    current = term
      ? all.filter((e) => [e.handle, e.title].join(' ').toLowerCase().includes(term))
      : all;
    shown = 0;
    tbody.innerHTML = '';
    paintMore();
  });

  more.addEventListener('click', paintMore);
  paintMore();
  window.__shotReady = true;
  return null;
}
