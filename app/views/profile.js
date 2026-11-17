// views/profile.js — an account's public profile, route #/u/<handle>.
//
// Who they are (avatar, name, bio, their public links), what they have done
// (a row of record tiles: entered, placed, won, podiums, best place, prizes),
// and every entry they have made, each linking back to its bounty. A handle
// the API does not know gets a plain not-found panel instead of an error.

import { profileOf } from '../api.js';
import { day, esc, picture, ratePct, tally, usd } from '../format.js';

function scoreNote(score) {
  if (!score || score.value == null) return '';
  const shown = (score.column?.source || '').includes('win_rate_micro')
    ? ratePct(score.value)
    : esc(score.display ?? score.value);
  return ` · ${esc(score.column?.title || 'Score')} ${shown}`;
}

function entryHtml(s) {
  const c = s.competition || {};
  const placed = s.placement ? `<span class="badge badge-open">Placed #${s.placement}</span>` : '';
  const prize = s.prize_usd ? `<span class="badge">${usd(s.prize_usd)} won</span>` : '';
  return `<li>
    <div>
      <strong><a href="#/bounty/${esc(c.slug)}">${esc(c.title || c.slug)}</a></strong>
      <p>${esc(s.title || 'Untitled entry')}</p>
      <p class="soft">Entered ${day(s.entered_at)}${scoreNote(s.score)} · pot ${usd(c.pot_usd ?? c.reward_usd)}</p>
    </div>
    <div class="entry-badges">${placed}${prize}</div>
  </li>`;
}

export async function showProfile(app, handle) {
  let p;
  try {
    p = await profileOf(handle);
  } catch {
    document.title = `@${handle} — make.fun bounties`;
    app.innerHTML = `<section class="panel">
      <h1 tabindex="-1">No public profile for @${esc(handle)}</h1>
      <p>make.fun has no public account with that handle. Check the spelling, or head back to the board.</p>
      <p><a href="#/">Back to the bounty board</a></p>
    </section>`;
    window.__shotReady = true;
    return null;
  }

  document.title = `@${p.handle} — make.fun bounties`;
  const r = p.record || {};
  const solutions = p.solutions || [];
  const links = [
    p.github_login && `<a href="https://github.com/${esc(p.github_login)}">GitHub @${esc(p.github_login)}</a>`,
    p.x && `<span>X ${esc(p.x)}</span>`,
    p.discord && `<span>Discord ${esc(p.discord)}</span>`,
    p.wallet && `<span title="${esc(p.wallet)}">Wallet ${esc(String(p.wallet).slice(0, 4))}…${esc(String(p.wallet).slice(-4))}</span>`,
  ].filter(Boolean).join(' · ');

  app.innerHTML = `
    <header class="profile-head">
      ${picture(p.avatar?.url || p.image, 'avatar avatar-big', `Avatar of @${p.handle}`)}
      <div>
        <h1 tabindex="-1">${esc(p.display_name || `@${p.handle}`)}</h1>
        <p class="lede">@${esc(p.handle)} · joined ${day(p.joined_at)}</p>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        ${links ? `<p class="profile-links">${links}</p>` : ''}
      </div>
    </header>
    <dl class="tiles">
      <div class="tile"><dt>Entered</dt><dd>${tally(r.competitions_entered)}</dd><p>bounties</p></div>
      <div class="tile"><dt>Placed</dt><dd>${tally(r.competitions_placed)}</dd><p>in the prizes</p></div>
      <div class="tile"><dt>Won</dt><dd>${tally(r.competitions_won)}</dd><p>first places</p></div>
      <div class="tile"><dt>Podiums</dt><dd>${tally(r.podium_finishes)}</dd><p>top-three finishes</p></div>
      <div class="tile"><dt>Best place</dt><dd>${r.best_placement ? `#${r.best_placement}` : '—'}</dd><p>so far</p></div>
      <div class="tile tile-pot"><dt>Prizes won</dt><dd>${usd(r.prize_usd != null ? Number(r.prize_usd) : null)}</dd><p>across all bounties</p></div>
    </dl>
    <section aria-labelledby="their-entries">
      <h2 id="their-entries">Entries <span class="count">${solutions.length}</span></h2>
      <ul class="entries">${solutions.map(entryHtml).join('') || '<li>No entries yet.</li>'}</ul>
    </section>`;
  window.__shotReady = true;
  return null;
}
