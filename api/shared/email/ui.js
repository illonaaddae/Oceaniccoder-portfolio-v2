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
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
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

function shell({ preview, body, reason }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">${FONT_LINK}<title>OceanicCoder</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-bottom:0;border-radius:14px 14px 0 0;padding:20px 28px">
<img src="${LOGO}" width="140" height="40" alt="OceanicCoder" style="display:block;height:40px;width:auto;max-width:140px">
</td></tr>
<tr><td style="background:#ffffff;border-left:1px solid ${C.line};border-right:1px solid ${C.line};padding:8px 28px 32px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink2}">${body}</td></tr>
<tr><td style="background:${C.footer};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:20px 28px;font-size:12px;line-height:1.6;color:${C.ink3}">
<a href="${SITE}" style="color:${C.tealDark};text-decoration:none">oceaniccoder.dev</a> &middot; <a href="mailto:${CONTACT}" style="color:${C.tealDark};text-decoration:none">${CONTACT}</a><br>${esc(reason)}
</td></tr></table></td></tr></table></body></html>`;
}

function heading({ eyebrow, title, intro, tone = "info" }) {
  const [color] = TONES[tone] || TONES.info;
  return (
    (eyebrow
      ? `<div style="font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${color};margin:0 0 8px">${esc(eyebrow)}</div>`
      : "") +
    `<h1 style="font-family:${FONT};font-size:26px;line-height:1.25;color:${C.ink};margin:0 0 12px;font-weight:700">${esc(title)}</h1>` +
    (intro ? `<p style="margin:0 0 20px">${multiline(intro)}</p>` : "")
  );
}

function p(text) {
  return `<p style="margin:0 0 16px">${multiline(text)}</p>`;
}

function card({ title, highlight, highlightLabel, rows = [] }) {
  const rowHtml = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:${C.ink3};font-size:13px">${esc(label)}</td><td align="right" style="padding:6px 0;color:${C.ink};font-size:13px;font-variant-numeric:tabular-nums">${esc(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:12px;margin:0 0 20px">
${title ? `<tr><td style="background:${C.footer};border-bottom:1px solid ${C.line};border-radius:12px 12px 0 0;padding:10px 16px;font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3}">${esc(title)}</td></tr>` : ""}
<tr><td style="padding:16px">
${highlight ? `${highlightLabel ? `<div style="font-size:12px;color:${C.ink3}">${esc(highlightLabel)}</div>` : ""}<div style="font-size:26px;font-weight:700;color:${C.ink};margin:2px 0 10px">${esc(highlight)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
</td></tr></table>`;
}

function button({ href, label, variant = "primary" }) {
  const styles =
    variant === "secondary"
      ? `background:#ffffff;color:${C.tealDark};border:1px solid ${C.line}`
      : `background:${C.tealDark};color:#ffffff;border:1px solid ${C.tealDark}`;
  return `<a href="${esc(safeUrl(href))}" style="display:inline-block;${styles};border-radius:10px;padding:12px 22px;font-size:15px;font-weight:600;text-decoration:none;margin:0 8px 8px 0">${esc(label)}</a>`;
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
  return `<div style="background:${bg};border-left:3px solid ${color};border-radius:8px;padding:12px 14px;margin:0 0 20px;font-size:14px;color:${C.ink2}">${multiline(text)}</div>`;
}

function divider() {
  return `<div style="border-top:1px solid ${C.line};margin:24px 0"></div>`;
}

function small(text) {
  return `<p style="margin:0;font-size:12px;color:${C.ink3}">${multiline(text)}</p>`;
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
  button,
  buttons,
  steps,
  notice,
  divider,
  small,
  lines,
};
