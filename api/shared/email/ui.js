// Email kit: table-based HTML with inline styles, which is what email clients
// render reliably. Ported from the Craigtec React Email kit as plain functions
// because api/ has no JSX build step. Every value passes through esc() and
// every link through safeUrl(); templates only compose these blocks.

const C = {
  navy: "#0a0f1a",
  teal: "#0C8599",
  tealDark: "#085866",
  tealLight: "#7dd3e0",
  ink: "#0f172a",
  ink2: "#334155",
  ink3: "#64748b",
  line: "#e2e8f0",
  bg: "#f1f5f9",
  footer: "#f8fafc",
  ok: "#15803d",
  okBg: "#f0fdf4",
  warn: "#b45309",
  warnBg: "#fffbeb",
  info: "#0e7490",
  infoBg: "#ecfeff",
  danger: "#b91c1c",
  dangerBg: "#fef2f2",
};
// Same face as the site. Apple Mail, iOS Mail and Outlook for Mac load it;
// Gmail and Outlook for Windows ignore web fonts and use the fallbacks.
const FONT =
  "'Ysabeau Office',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Ysabeau+Office:wght@400;600;700&display=swap" rel="stylesheet">';
// Full wordmark (336x97); it already spells the name, so no text beside it.
const LOGO = "https://oceaniccoder.dev/images/logo/Oceaniccoder-logo@3x.png";
const SITE = "https://oceaniccoder.dev";
const CONTACT = "hello@oceaniccoder.dev";
const TONES = {
  ok: [C.ok, C.okBg],
  warn: [C.warn, C.warnBg],
  info: [C.info, C.infoBg],
  danger: [C.danger, C.dangerBg],
};

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(u) {
  try {
    const url = new URL(String(u));
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "http:" && url.hostname === "localhost") return url.toString();
  } catch {
    /* fall through */
  }
  return "#";
}

function multiline(text) {
  return esc(text).replace(/\n/g, "<br>");
}

// Small caps label used for eyebrows, card titles and the header reference.
const LABEL = `font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase`;

// meta = { label: "Quote", number: "Q-2026-0007" } prints a document
// reference opposite the logo, like a letterhead.
function letterhead(meta) {
  const ref = meta?.number
    ? `<td align="right" style="vertical-align:middle;padding-left:16px"><div style="${LABEL};color:${C.ink3}">${esc(meta.label)}</div><div style="font-family:${FONT};font-size:15px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums;white-space:nowrap;margin-top:2px">${esc(meta.number)}</div></td>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img class="oc-logo" src="${LOGO}" width="140" height="40" alt="OceanicCoder" style="display:block;height:40px;width:auto;max-width:140px"></td>${ref}
</tr></table>`;
}

// Dark mode for the clients that honour it (Apple Mail, iOS Mail, Outlook for
// Mac). Every colour lives inline, so the rules match the palette values in
// those inline styles rather than classes; templates need no changes. Clients
// that drop prefers-color-scheme rules, Gmail among them, show the light
// version or darken it their own way.
const DARK = {
  page: "#000b21",
  sheet: "#0b1730",
  footer: "#07122a",
  line: "#22324d",
  ink: "#e8eef5",
  ink2: "#c7d2de",
  ink3: "#9fb0c3",
  link: "#5fd0e6",
  button: "#26a9c5",
  // The light header (#04333B) is close to the dark sheet; lifted so the card keeps its edge.
  ocean: "#0b4f5c",
};
// Gmail's apps ignore prefers-color-scheme and invert colours themselves,
// turning the ocean header pale and its white text dark. A same-colour
// gradient keeps the background (Gmail leaves background images alone) and
// two blend layers turn the inverted text back to white. The blend flips any
// tinted text to its opposite hue, so text on dark surfaces stays white or
// near-neutral, and coloured stamps are filled (Gmail keeps the fill). Gmail swaps the
// doctype for a <u>, so "u + .body" matches nowhere else, and in light mode
// both blends are no-ops over black. hteumeuleu.com/2021/fixing-gmail-dark-mode-css-blend-modes
const GMAIL_CSS = `u + .body .gmail-screen{background:#000;mix-blend-mode:screen}
u + .body .gmail-difference{background:#000;mix-blend-mode:difference}`;
const DARK_CSS = `<style>:root{color-scheme:light dark}
${GMAIL_CSS}
@media (prefers-color-scheme:dark){
body,[style*="background:${C.bg}"]{background:${DARK.page}!important}
[style*="background:#ffffff"]{background:${DARK.sheet}!important}
[style*="background:${C.footer}"]{background:${DARK.footer}!important}
[bgcolor="#04333B"]{background:${DARK.ocean}!important}
.oc-logo{background:#ffffff;border-radius:8px;padding:6px 10px!important}
[style*="${C.line}"]{border-color:${DARK.line}!important}
[style*="color:${C.ink}"]{color:${DARK.ink}!important}
[style*="color:${C.ink2}"]{color:${DARK.ink2}!important}
[style*="color:${C.ink3}"]{color:${DARK.ink3}!important}
[style*="color:${C.tealDark}"]{color:${DARK.link}!important}
[style*="background:${C.tealDark}"]{background:${DARK.button}!important;border-color:${DARK.button}!important;color:${DARK.page}!important}
[style*="color:${C.ok}"]{color:#4ade80!important}
[style*="color:${C.warn}"]{color:#fbbf24!important}
[style*="color:${C.info}"]{color:#67e8f9!important}
[style*="color:${C.danger}"]{color:#f87171!important}
[style*="background:${C.okBg}"]{background:#0c2a1a!important}
[style*="background:${C.warnBg}"]{background:#2d2008!important}
[style*="background:${C.infoBg}"]{background:#082a33!important}
[style*="background:${C.dangerBg}"]{background:#2e0f12!important}
}</style>`;

function shell({ preview, body, reason, meta }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${FONT_LINK}${DARK_CSS}<title>OceanicCoder</title></head>
<body class="body" style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:14px 14px 0 0;padding:24px 28px">
${letterhead(meta)}
</td></tr>
<tr><td style="background:#ffffff;border-left:1px solid ${C.line};border-right:1px solid ${C.line};padding:32px 28px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink2}">${body}</td></tr>
<tr><td style="background:${C.footer};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:20px 28px;font-size:12px;line-height:1.6;color:${C.ink3}">
<a href="${SITE}" style="color:${C.tealDark};text-decoration:none">oceaniccoder.dev</a> &middot; <a href="mailto:${CONTACT}" style="color:${C.tealDark};text-decoration:none">${CONTACT}</a><br>${esc(reason)}
</td></tr></table></td></tr></table></body></html>`;
}

function heading({ eyebrow, title, intro, tone = "info" }) {
  const [color] = TONES[tone] || TONES.info;
  return (
    (eyebrow ? `<div style="${LABEL};color:${color};margin:0 0 10px">${esc(eyebrow)}</div>` : "") +
    `<h1 style="font-family:${FONT};font-size:28px;line-height:1.2;color:${C.ink};margin:0 0 ${intro ? 12 : 24}px;font-weight:700;letter-spacing:-.01em">${esc(title)}</h1>` +
    (intro ? `<p style="margin:0 0 20px">${multiline(intro)}</p>` : "")
  );
}

function p(text) {
  return `<p style="margin:0 0 16px">${multiline(text)}</p>`;
}

// Cards read like a bank statement: the title (and the figure, when there is
// one) sits on a deep ocean header, the details on white below. bgcolor keeps
// the header dark in clients that drop the background style.
const OCEAN = "#04333B";
// Near-neutral, so Gmail's colour flip barely shifts it.
const ON_OCEAN = "#cbd5e1";
// Stamp fills on the ocean header. Filled rather than outlined, with
// near-black text, so Gmail's dark mode shows the same green or yellow.
const STAMPS = { ok: "#86efac", warn: "#fcd34d", info: "#a5f3fc", danger: "#fca5a5" };
const STAMP_INK = "#111111";

// Content on a dark surface, wrapped so Gmail's inversion leaves it white.
// inner is extra style for the inner layer; a button puts its padding there so
// the layers cover the whole button and leave no seam at their edge.
function onDark(html, inline = false, inner = "") {
  const tag = inline ? "span" : "div";
  const outer = inline ? ' style="display:inline-block;border-radius:10px"' : "";
  const innerStyle =
    inline || inner
      ? ` style="${inline ? "display:inline-block;border-radius:10px;" : ""}${inner}"`
      : "";
  return `<${tag} class="gmail-screen"${outer}><${tag} class="gmail-difference"${innerStyle}>${html}</${tag}></${tag}>`;
}
const keepDark = (color) =>
  `background:${color};background-image:linear-gradient(${color},${color})`;

// "GHS 5,100.00": the code as a smaller prefix on the same line, so the figure
// fits a phone-width card without breaking.
function figureText(value) {
  const m = /^([A-Z]{3}) (.+)$/.exec(String(value));
  if (!m) return esc(value);
  return `<span style="font-size:.65em;font-weight:600;letter-spacing:.03em">${esc(m[1])}</span>&nbsp;${esc(m[2])}`;
}

// status = { label: "Paid", tone: "ok" } prints a stamp opposite the title.
// body is trusted template HTML shown on white under the rows; callers escape
// anything in it that came from a user.
function card({ title, highlight, highlightLabel, status, rows = [], body = "" }) {
  const tone = STAMPS[status?.tone] ? status.tone : "info";
  const stampColor = STAMPS[tone];
  const stamp = status
    ? `<span style="display:inline-block;${keepDark(stampColor)};border-radius:4px">${onDark(`${status.tone === "ok" ? "&#10003; " : ""}${esc(status.label)}`, true, `${LABEL};color:${STAMP_INK};padding:4px 8px;white-space:nowrap;border-radius:4px`)}</span>`
    : "";
  // Title and stamp share a row in their own table, outside the Gmail layers,
  // so the stamp sits at the right edge in every client.
  const top =
    title || stamp
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle">${onDark(`<div style="${LABEL};color:${ON_OCEAN}">${esc(title)}</div>`)}</td>${stamp ? `<td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;text-align:right">${stamp}</td>` : ""}</tr></table>`
      : "";
  // Amounts are short; a date like "Thursday, 15 October 2026 at 10:00 AM" is
  // not, so long figures drop to a size that keeps them to a line or two.
  const figureSize = String(highlight ?? "").length > 18 ? 24 : 36;
  const figure = highlight
    ? `${highlightLabel ? `<div style="font-size:14px;color:${ON_OCEAN};margin-top:${top ? 14 : 0}px">${esc(highlightLabel)}</div>` : ""}<div style="font-size:${figureSize}px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;margin-top:${highlightLabel || !top ? 2 : 12}px">${figureText(highlight)}</div>`
    : "";
  const shown = rows.filter(([, value]) => value !== undefined && value !== null && value !== "");
  const rowHtml = shown
    .map(
      ([label, value], i) =>
        `<tr><td style="padding:12px 22px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.ink3};font-size:14px">${esc(label)}</td><td align="right" style="padding:12px 22px 12px 12px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.ink};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${esc(value)}</td></tr>`,
    )
    .join("");
  if (!top && !figure) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:8px;margin:0 0 24px">${rowHtml}</table>`;
  }
  const below =
    (shown.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>`
      : "") + (body ? `<div style="padding:16px 22px 10px">${body}</div>` : "");
  const headRadius = below ? "8px 8px 0 0" : "8px";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 24px">
<tr><td bgcolor="${OCEAN}" style="${keepDark(OCEAN)};border-radius:${headRadius};padding:${highlight ? "20px 22px 22px" : "14px 22px"}">${top}${figure ? onDark(figure) : ""}</td></tr>
${below ? `<tr><td style="border:1px solid ${C.line};border-top:0;border-radius:0 0 8px 8px">${below}</td></tr>` : ""}
</table>`;
}

// A one-time code on its own, large and monospaced. Digits stay one text run
// (spacing is CSS only), and user-select:all makes one tap or click select
// the whole code in clients that honour it (Apple Mail, iOS Mail and others).
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

function codeBlock({ label, code }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
<tr><td align="center" bgcolor="${OCEAN}" style="${keepDark(OCEAN)};border-radius:8px;padding:20px 22px">
${onDark(`${label ? `<div style="${LABEL};color:${ON_OCEAN};margin:0 0 10px">${esc(label)}</div>` : ""}<div style="font-family:${MONO};font-size:36px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:.25em;padding-left:.25em;-webkit-user-select:all;user-select:all">${esc(code)}</div>`)}
</td></tr></table>`;
}

// The primary button has no border (Gmail would invert it to a light outline)
// and carries its padding on the Gmail layers, 1px more to match the
// secondary button's border.
function button({ href, label, variant = "primary" }) {
  const base = `display:inline-block;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin:0 8px 8px 0`;
  if (variant === "secondary") {
    return `<a href="${esc(safeUrl(href))}" style="${base};background:#ffffff;color:${C.tealDark};border:1px solid ${C.line};padding:12px 22px">${esc(label)}</a>`;
  }
  return `<a href="${esc(safeUrl(href))}" style="${base};${keepDark(C.tealDark)};color:#ffffff">${onDark(esc(label), true, "padding:13px 23px")}</a>`;
}

function buttons(...html) {
  return `<div style="margin:4px 0 20px">${html.join("")}</div>`;
}

function steps(items) {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">` +
    items
      .map(
        (text, i) =>
          `<tr><td style="vertical-align:top;padding:0 12px 10px 0"><div style="width:24px;height:24px;border-radius:12px;background:${C.tealDark};color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center">${i + 1}</div></td><td style="vertical-align:top;padding:2px 0 10px;font-size:14px;color:${C.ink2}">${esc(text)}</td></tr>`,
      )
      .join("") +
    `</table>`
  );
}

function notice({ tone = "info", text }) {
  const [color, bg] = TONES[tone] || TONES.info;
  return `<div style="background:${bg};border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:14px;font-weight:600;color:${color}">${multiline(text)}</div>`;
}

function divider() {
  return `<div style="border-top:1px solid ${C.line};margin:24px 0"></div>`;
}

function small(text, link) {
  const a = link
    ? ` <a href="${esc(safeUrl(link.href))}" style="color:${C.tealDark};font-weight:600">${esc(link.label)}</a>`
    : "";
  return `<p style="margin:0;font-size:13px;color:${C.ink3}">${multiline(text)}${a}</p>`;
}

// "GHS 5,100.00": the code, not a symbol, so it reads the same in every font.
function money(amount, currency) {
  const n = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${n}` : n;
}

function lines(...parts) {
  return parts.filter((x) => x !== undefined && x !== null && x !== "").join("\n");
}

module.exports = {
  C,
  esc,
  safeUrl,
  multiline,
  shell,
  heading,
  p,
  card,
  codeBlock,
  button,
  buttons,
  steps,
  notice,
  divider,
  small,
  money,
  lines,
};
