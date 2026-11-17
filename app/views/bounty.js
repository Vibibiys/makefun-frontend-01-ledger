// views/bounty.js — one bounty's page, route #/bounty/<slug>.
//
// The summary and the lede, a row of fact tiles (the live pot with its base
// and fee parts, the entry fee, the entry count, the time left, the opening
// date), the rewards table at the live pot, the full description and rules
// rendered from Markdown, and the latest entries, fifteen at a time.
// As everywhere in this app, whether the bounty still takes entries is
// decided by its deadline, not by its status alone.

import { bountyDetail } from '../api.js';
import { countdown, day, esc, stamp, tally, usd } from '../format.js';
import { renderMd } from '../md.js';

const ENTRIES_PAGE = 15;

function rewardsHtml(b) {
  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length > 0) {
    const rows = b.rewardsNow.map((r) => `<tr>
      <td>${r.place}</td><td>${usd(r.baseUsd)}</td><td>${usd(r.feeShareUsd)}</td><td><strong>${usd(r.amountUsd)}</strong></td>
    </tr>`).join('');
    return `<div class="table-wrap"><table>
      <caption>Rewards at the live pot — the base prize plus each place's share of the entry fees</caption>
      <thead><tr><th scope="col">Place</th><th scope="col">Base</th><th scope="col">Fee share</th><th scope="col">Pays now</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }
  if (b.rewards && typeof b.rewards === 'object') {
    const rows = Object.entries(b.rewards)
      .sort((x, y) => Number(x[0]) - Number(y[0]))
      .map(([place, amount]) => `<tr><td>${esc(place)}</td><td><strong>${usd(amount)}</strong></td></tr>`)
      .join('');
    return `<div class="table-wrap"><table>
      <caption>Rewards</caption>
      <thead><tr><th scope="col">Place</th><th scope="col">Prize</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }
  return '';
}

function entryHtml(s) {
  const by = s.hunter ? `<a href="#/u/${esc(s.hunter)}">@${esc(s.hunter)}</a>` : 'an entrant';
  const score = s.score != null ? ` · score ${tally(s.score)}` : '';
  return `<li>
    <div><strong>${esc(s.title || 'Untitled entry')}</strong>
    <p>by ${by} · ${day(s.createdAt)}${score}</p></div>
    <span class="badge">${esc(s.status || '')}</span>
  </li>`;
}

export async function showBounty(app, slug) {
  const b = await bountyDetail(slug);
  document.title = `${b.title} — make.fun bounties`;
  const left = countdown(b.deadline);
  const open = b.status === 'open' && !left.gone && b.acceptingSubmissions !== false;
  const state = open ? 'Open for entries' : b.status === 'resolved' ? 'Resolved' : 'Closed — judging';
  const entries = Array.isArray(b.submissions) ? b.submissions : [];

  app.innerHTML = `
    <p class="crumbs"><a href="#/">← Bounty board</a></p>
    <header class="page-head">
      <div class="badges">
        <span class="badge">${esc(b.category || 'Bounty')}</span>
        <span class="badge ${open ? 'badge-open' : 'badge-shut'}">${state}</span>
        ${(b.skills || []).map((s) => `<span class="badge badge-dim">${esc(s)}</span>`).join('')}
      </div>
      <h1 tabindex="-1">${esc(b.title)}</h1>
      <p class="lede">${esc(b.summary || '')}</p>
      <p class="actions">
        <a class="btn" href="#/bounty/${esc(b.slug)}/leaderboard">Leaderboard</a>
        <a class="btn btn-quiet" href="https://make.fun/bounty/${esc(b.slug)}">This bounty on make.fun</a>
      </p>
    </header>
    <dl class="tiles">
      <div class="tile tile-pot"><dt>Live pot</dt><dd>${usd(b.potUsd ?? b.rewardAmount)}</dd>
        <p>base ${usd(b.rewardAmount)} + ${usd(b.entryFeesUsd ?? 0)} in entry fees</p></div>
      <div class="tile"><dt>Entry fee</dt><dd>${b.entryFeeUsd != null ? usd(Number(b.entryFeeUsd)) : 'Free'}</dd>
        <p>${b.entryFeePayers ? `${tally(b.entryFeePayers)} entrants have paid` : 'per account, once'}</p></div>
      <div class="tile"><dt>Entries</dt><dd>${tally(b.submissionCount)}</dd><p>submitted so far</p></div>
      <div class="tile"><dt>${open ? 'Closes' : 'Deadline'}</dt>
        <dd class="small"><span data-deadline="${esc(b.deadline)}">${left.label}</span></dd><p>${stamp(b.deadline)}</p></div>
      <div class="tile"><dt>Opened</dt><dd class="small">${day(b.opensAt || b.publishedAt)}</dd>
        <p>by ${esc(b.sponsor?.name || 'make.fun')}</p></div>
    </dl>
    <section aria-labelledby="rewards-title"><h2 id="rewards-title">Rewards</h2>${rewardsHtml(b)}</section>
    ${b.description ? `<section class="prose" aria-labelledby="about-title"><h2 id="about-title">About this bounty</h2>${renderMd(b.description)}</section>` : ''}
    ${b.rules ? `<details class="rules"><summary>Full rules</summary><div class="prose">${renderMd(b.rules)}</div></details>` : ''}
    <section aria-labelledby="entries-title">
      <h2 id="entries-title">Latest entries <span class="count">${entries.length}</span></h2>
      <ul class="entries" id="entries"></ul>
      <p><button id="more" type="button" class="btn btn-quiet">Show more entries</button></p>
    </section>`;

  const list = app.querySelector('#entries');
  const more = app.querySelector('#more');
  let shown = 0;

  function paintMore() {
    const chunk = entries.slice(shown, shown + ENTRIES_PAGE);
    list.insertAdjacentHTML('beforeend', chunk.map(entryHtml).join(''));
    shown += chunk.length;
    more.hidden = shown >= entries.length;
    if (entries.length === 0) list.innerHTML = '<li>No entries yet.</li>';
  }

  more.addEventListener('click', paintMore);
  paintMore();
  window.__shotReady = true;

  return setInterval(() => {
    const el = app.querySelector('[data-deadline]');
    if (el) el.textContent = countdown(el.dataset.deadline).label;
  }, 30_000);
}
