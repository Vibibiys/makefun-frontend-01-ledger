// main.js — the shell and the router; all the first load carries.
//
// Four surfaces, four hash routes, one lazily loaded module each:
//
//   #/                            the bounty board
//   #/bounty/<slug>               a bounty's page
//   #/bounty/<slug>/leaderboard   that bounty's leaderboard
//   #/u/<handle>                  an account's public profile
//
// A view module is fetched with a literal import() the first time its route
// opens, so the board never pays for the leaderboard's code. While a route
// loads, window.__shotReady is false; the view sets it true once its data is
// on screen — screenshot tooling waits on that flag. A view may hand back an
// interval (the board and bounty pages tick their countdowns); the router
// clears it when the route changes, so timers never outlive their page.

const app = document.getElementById('app');
let timer = null;

const ROUTES = [
  { pattern: /^#\/bounty\/([^/]+)\/leaderboard\/?$/, view: () => import('./views/leaderboard.js'), open: (mod, m) => mod.showLeaderboard(app, decodeURIComponent(m[1])) },
  { pattern: /^#\/bounty\/([^/]+)\/?$/, view: () => import('./views/bounty.js'), open: (mod, m) => mod.showBounty(app, decodeURIComponent(m[1])) },
  { pattern: /^#\/u\/([^/]+)\/?$/, view: () => import('./views/profile.js'), open: (mod, m) => mod.showProfile(app, decodeURIComponent(m[1])) },
  { pattern: /^#\/?$/, view: () => import('./views/board.js'), open: (mod) => mod.showBoard(app) },
];

function showError(err) {
  document.title = 'Something went wrong — make.fun bounties';
  app.innerHTML = `<section class="panel">
    <h1 tabindex="-1">Something went wrong</h1>
    <p>${String(err?.message ?? err)}</p>
    <p><a href="#/">Back to the bounty board</a></p>
  </section>`;
  window.__shotReady = true;
}

async function navigate() {
  window.__shotReady = false;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  const route = ROUTES.find((r) => r.pattern.test(location.hash)) ?? ROUTES[ROUTES.length - 1];
  const match = route.pattern.exec(location.hash);
  app.setAttribute('aria-busy', 'true');
  app.innerHTML = '<p class="loading" role="status">Fetching live data from make.fun…</p>';
  try {
    const mod = await route.view();
    timer = (await route.open(mod, match)) ?? null;
  } catch (err) {
    showError(err);
  } finally {
    app.removeAttribute('aria-busy');
  }
  window.scrollTo(0, 0);
  app.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
}

// The header's jump box: a handle typed there opens that account's profile.
document.getElementById('jump').addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = new FormData(event.target).get('handle').trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', navigate);
navigate();
