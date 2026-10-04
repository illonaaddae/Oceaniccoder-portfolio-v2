// What visitors may write, field by field. Used by /api/submit; no Cosmos or
// network calls here, so it's unit-tested on its own.
//
// Every accepted field is listed with its type and limits. Unknown fields are
// rejected rather than dropped, so a form that drifts from this list fails
// loudly instead of losing data. Fields the server owns (status, approval,
// ordering) are set here and ignored if the browser sends them.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOC_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (max, extra = {}) => ({ type: "string", max, ...extra });
const required = (spec) => ({ ...spec, required: true });
const flag = { type: "boolean" };

/** An https link on one of `hosts`. */
const link = (hosts) => ({ type: "string", max: 500, hosts });
const MEETING_HOSTS = ["meet.google.com", "zoom.us", "calendar.google.com", "www.google.com"];
// Testimonial photos: only our own media storage, so an approved testimonial
// can't embed a third-party image (tracking pixel, swapped content).
const MEDIA_HOSTS = [
  `${process.env.AZURE_STORAGE_ACCOUNT || "oceaniccodermedia"}.blob.core.windows.net`,
];

const SCHEMAS = {
  comments: {
    fields: {
      postId: required(text(64, { pattern: DOC_ID })),
      authorName: required(text(100)),
      authorEmail: text(254, { pattern: EMAIL }),
      content: required(text(5000)),
      parentId: text(64, { pattern: DOC_ID }),
    },
    // Comments have always been published straight away; the admin can
    // unapprove one from the dashboard.
    server: { isApproved: true },
  },
  messages: {
    fields: {
      name: required(text(100)),
      email: required(text(254, { pattern: EMAIL })),
      subject: required(text(200)),
      message: required(text(5000)),
    },
    server: { status: "new" },
  },
  bookings: {
    fields: {
      name: required(text(100)),
      email: required(text(254, { pattern: EMAIL })),
      phone: text(40),
      meetingType: required(text(100)),
      preferredDate: required(text(10, { pattern: DATE })),
      preferredTime: required(text(20)),
      timezone: required(text(100)),
      message: text(2000),
      preferredPlatform: text(20),
      meetingLink: link(MEETING_HOSTS),
      zoomLink: link(MEETING_HOSTS),
      calendarEventLink: link(MEETING_HOSTS),
    },
    server: { status: "pending" },
  },
  project_inquiries: {
    fields: {
      name: required(text(100)),
      email: required(text(254, { pattern: EMAIL })),
      phone: text(40),
      preferredContact: text(20),
      projectType: required(text(100)),
      description: required(text(5000)),
      features: { type: "array", maxItems: 30, item: text(100) },
      timeline: text(100),
      budgetRange: text(100),
      notes: text(2000),
      hasLogo: flag,
      needsDomain: flag,
      domainExtension: text(20),
      needsHosting: flag,
    },
    server: { status: "new" },
  },
  testimonials: {
    fields: {
      name: required(text(100)),
      role: required(text(100)),
      company: text(100),
      content: required(text(2000)),
      rating: { type: "integer", min: 1, max: 5 },
      image: link(MEDIA_HOSTS),
    },
    // Hidden from the site until the admin approves it.
    server: { approved: false, featured: false, order: 999 },
  },
};

const SERVER_OWNED = new Set(["status", "isApproved", "approved", "featured", "order"]);

class Invalid extends Error {}

function checkString(name, value, spec) {
  if (typeof value !== "string") throw new Invalid(`${name} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > spec.max) throw new Invalid(`${name} is too long (max ${spec.max})`);
  if (trimmed && spec.pattern && !spec.pattern.test(trimmed))
    throw new Invalid(`${name} is invalid`);
  if (trimmed && spec.hosts !== undefined) {
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Invalid(`${name} must be a link`);
    }
    if (url.protocol !== "https:") throw new Invalid(`${name} must be an https link`);
    if (!spec.hosts.includes(url.hostname)) throw new Invalid(`${name} isn't allowed`);
  }
  return trimmed;
}

function checkField(name, value, spec) {
  switch (spec.type) {
    case "string":
      return checkString(name, value, spec);
    case "boolean":
      if (typeof value !== "boolean") throw new Invalid(`${name} must be true or false`);
      return value;
    case "integer":
      if (!Number.isInteger(value) || value < spec.min || value > spec.max) {
        throw new Invalid(`${name} must be a whole number from ${spec.min} to ${spec.max}`);
      }
      return value;
    case "array":
      if (!Array.isArray(value)) throw new Invalid(`${name} must be a list`);
      if (value.length > spec.maxItems) throw new Invalid(`${name} has too many items`);
      return value.map((v, i) => checkString(`${name}[${i}]`, v, spec.item)).filter(Boolean);
    default:
      throw new Error(`unknown type ${spec.type}`);
  }
}

/**
 * Returns the document to store, or throws Invalid with a message safe to show
 * the visitor. Empty optional strings are dropped rather than stored.
 */
function validateSubmission(collection, body) {
  // Own properties only: "constructor" or "__proto__" must not resolve to
  // Object.prototype members.
  const schema = Object.hasOwn(SCHEMAS, collection) ? SCHEMAS[collection] : null;
  if (!schema) throw new Invalid("Unknown form");
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Invalid("Invalid request");

  const doc = {};
  for (const [name, value] of Object.entries(body)) {
    if (SERVER_OWNED.has(name) || value === undefined || value === null) continue;
    const spec = Object.hasOwn(schema.fields, name) ? schema.fields[name] : null;
    if (!spec) throw new Invalid(`Unexpected field: ${name}`);
    const clean = checkField(name, value, spec);
    if (clean !== "") doc[name] = clean;
  }
  for (const [name, spec] of Object.entries(schema.fields)) {
    if (spec.required && (doc[name] === undefined || doc[name] === "")) {
      throw new Invalid(`${name} is required`);
    }
  }
  return { ...doc, ...schema.server };
}

module.exports = { SCHEMAS, Invalid, validateSubmission };
