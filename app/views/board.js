// views/board.js — the bounty board, route #/.
//
// Every public bounty as a card: its live pot (the base reward plus the
// entry fees paid so far — the number the API calls potUsd), its entry fee
// or "Free entry", its entry count, and the time left. Openness is judged
// by the deadline, never by the status alone: the API can keep calling a
// bounty open after its deadline has passed, so the board splits the cards
// into "Open for entries" and "Closed — judging & results" by the clock.
//
// Search and sort repaint only the card area. Later board pages are followed
// in the background and merged in. Countdowns tick by rewriting just the
// time-left text nodes, every 30 seconds.

import { boardNext, boardPage } from '../api.js';
import { countdown, esc, stamp, tally, usd } from '../format.js';

const livePot = (b) => Number(b.potUsd ?? b.rewardAmount ?? 0);
const takesEntries = (b, now) => b.status === 'open' && new Date(b.deadline).getTime() > now;

function cardHtml(b, now) {
  const open = takesEntries(b, now);
  const left = countdown(b.deadline, now);
  const state = open ? 'Open' : b.status === 'resolved' ? 'Resolved' : 'Closed';
  const fee = b.entryFeeUsd != null ? `${usd(Number(b.entryFeeUsd))} entry fee` : 'Free entry';
  return `<article class="card">
    <div class="badges">
      <span class="badge">${esc(b.category || 'Bounty')}</span>
      <span class="badge ${open ? 'badge-open' : 'badge-shut'}">${state}</span>
    </div>
    <h3><a href="#/bounty/${esc(b.slug)}">${esc(b.title)}</a></h3>
    <p class="summary">${esc(b.summary || '')}</p>
    <p class="pot-line"><strong>${usd(livePot(b))}</strong> <span>live pot</span></p>
    <dl class="facts">
      <div><dt>Entry</dt><dd>${fee}</dd></div>
      <div><dt>Entries</dt><dd>${tally(b.submissionCount)}</dd></div>
      <div><dt>${open ? 'Closes' : 'Deadline'}</dt><dd><span data-deadline="${esc(b.deadline)}">${left.label}</span></dd></div>
    </dl>
    <p class="sponsor">${esc(b.sponsor?.name || 'make.fun')} · deadline ${stamp(b.deadline)}</p>
  </article>`;
}

const ORDERINGS = {
  ending: (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  pot: (a, b) => livePot(b) - livePot(a),
  entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
  newest: (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
};

export async function showBoard(app) {
  document.title = 'Bounty board — make.fun bounties';
  const first = await boardPage();
  const items = [...(first.items || [])];

  const now = Date.now();
  const openNow = items.filter((b) => takesEntries(b, now)).length;
  const potTotal = items.reduce((sum, b) => sum + livePot(b), 0);
  app.innerHTML = `
    <section class="board-head">
      <h1 tabindex="-1">The bounty board</h1>
      <p>${tally(items.length)} bounties · ${tally(openNow)} open for entries · <strong>${usd(potTotal)}</strong> in live pots</p>
    </section>
    <div class="filters">
      <label>Search <input id="q" type="search" placeholder="title, category, skill…" autocomplete="off"></label>
      <label>Sort <select id="sort">
        <option value="ending">Ending soonest</option>
        <option value="pot">Biggest live pot</option>
        <option value="entries">Most entries</option>
        <option value="newest">Newest</option>
      </select></label>
    </div>
    <div id="lists"></div>`;

  const lists = app.querySelector('#lists');
  const query = app.querySelector('#q');
  const sort = app.querySelector('#sort');

  function paint() {
    const term = query.value.trim().toLowerCase();
    const visible = items
      .filter((b) => !term || [b.title, b.category, b.summary, ...(b.skills || [])].join(' ').toLowerCase().includes(term))
      .sort(ORDERINGS[sort.value]);
    const at = Date.now();
    const group = (title, list) => (list.length
      ? `<section><h2>${title} <span class="count">${list.length}</span></h2><div class="cards">${list.map((b) => cardHtml(b, at)).join('')}</div></section>`
      : '');
    lists.innerHTML =
      group('Open for entries', visible.filter((b) => takesEntries(b, at))) +
        group('Closed — judging & results', visible.filter((b) => !takesEntries(b, at))) ||
      '<p class="panel">No bounty matches that search.</p>';
  }

  query.addEventListener('input', paint);
  sort.addEventListener('change', paint);
  paint();
  window.__shotReady = true;

  // If the board ever outgrows its first page, follow the cursor quietly and
  // fold the rest in as it arrives.
  (async () => {
    let cursor = first.next_cursor;
    while (cursor) {
      const page = await boardNext(cursor);
      items.push(...(page.items || []));
      cursor = page.next_cursor;
      paint();
    }
  })();

  // The countdown ticker: rewrite only the time-left spans, never the grid.
  return setInterval(() => {
    const at = Date.now();
    for (const el of lists.querySelectorAll('[data-deadline]')) {
      el.textContent = countdown(el.dataset.deadline, at).label;
    }
  }, 30_000);
}
