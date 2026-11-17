// md.js — a small Markdown renderer for bounty descriptions and rules.
//
// Safety comes first: the source is HTML-escaped before anything else runs,
// and the renderer only ever puts back the handful of tags it builds itself,
// so text from the API cannot smuggle markup into the page. Links that point
// at a bounty or a profile on make.fun are rewritten to this app's own
// routes, so a description never has to send the reader away.

import { esc } from './format.js';

/** Where a Markdown link should land inside this app, or null to drop it. */
function route(href) {
  if (!href) return null;
  let url = href.trim();
  if (url.startsWith('/')) url = 'https://make.fun' + url;
  const bounty = /^https:\/\/make\.fun\/bounty\/([^/?#]+)/.exec(url);
  if (bounty) return `#/bounty/${bounty[1]}`;
  const profile = /^https:\/\/make\.fun\/u\/([^/?#]+)/.exec(url);
  if (profile) return `#/u/${profile[1]}`;
  return /^(https?:|mailto:)/i.test(url) ? url : null;
}

/** Inline markup: code spans, images, links, bold, italic, strikethrough. */
function inline(raw) {
  const spans = [];
  let text = esc(raw).replace(/`([^`]+)`/g, (_m, code) => {
    spans.push(code);
    return `\u0001${spans.length - 1}\u0002`;
  });
  text = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, href) => {
      const url = route(href);
      if (!url || !url.startsWith('http')) return alt;
      const cors = url.startsWith('https://make.fun/') ? ' crossorigin="anonymous"' : '';
      return `<img class="md-img" src="${esc(url)}" alt="${alt}" loading="lazy"${cors}>`;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
      const url = route(href);
      return url ? `<a href="${esc(url)}">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return text.replace(/\u0001(\d+)\u0002/g, (_m, i) => `<code>${spans[Number(i)]}</code>`);
}

const rowLine = (line) => /^\s*\|.*\|\s*$/.test(line);
const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const bullet = /^\s*([-*+]|\d+\.)\s+/;

/** Render a Markdown document to an HTML string. */
export function renderMd(source) {
  if (!source) return '';
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const buf = [];
      for (i += 1; i < lines.length && !lines[i].startsWith('```'); i += 1) buf.push(lines[i]);
      i += 1;
      html.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
    } else if (!line.trim()) {
      i += 1;
    } else if (/^#{1,4}\s/.test(line)) {
      const depth = line.indexOf(' ');
      html.push(`<h${depth + 1}>${inline(line.slice(depth + 1))}</h${depth + 1}>`);
      i += 1;
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push('<hr>');
      i += 1;
    } else if (line.startsWith('>')) {
      const quoted = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      html.push(`<blockquote>${quoted.map((q) => `<p>${inline(q)}</p>`).join('')}</blockquote>`);
    } else if (rowLine(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = cellsOf(line);
      i += 2;
      const body = [];
      while (i < lines.length && rowLine(lines[i])) {
        body.push(cellsOf(lines[i]));
        i += 1;
      }
      const headHtml = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const bodyHtml = body
        .map((row) => `<tr>${head.map((_c, j) => `<td>${inline(row[j] ?? '')}</td>`).join('')}</tr>`)
        .join('');
      html.push(`<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
    } else if (bullet.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && bullet.test(lines[i])) {
        items.push(lines[i].replace(bullet, ''));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
    } else {
      const para = [line];
      i += 1;
      while (
        i < lines.length && lines[i].trim() &&
        !/^(#{1,4}\s|```|>)/.test(lines[i]) && !bullet.test(lines[i]) && !rowLine(lines[i])
      ) {
        para.push(lines[i]);
        i += 1;
      }
      html.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return html.join('\n');
}
