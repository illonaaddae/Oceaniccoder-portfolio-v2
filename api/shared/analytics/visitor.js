// Daily visitor hash for page views, without cookies or a stored IP.
//
// visitorHash = HMAC-SHA256(salt of the day, ip + ua + host), first 16 hex
// chars. The salt is 32 random bytes kept in the analytics container as
// `salt:<day>` with a 48-hour TTL, so once it expires nobody (us included) can
// link a hash back to an IP or to the same visitor on another day. The IP and
// UA only ever live in memory for the length of the request.
//
// There is deliberately no fallback: if the salt can't be read or created, the
// caller drops the event rather than hash without one.

const crypto = require("crypto");

const SALT_TTL_SECONDS = 48 * 60 * 60;

const saltId = (day) => `salt:${day}`;

async function readSalt(container, day) {
  try {
    const { resource } = await container.item(saltId(day), day).read();
    return (resource && resource.salt) || null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

/**
 * A getter for the salt of a UTC day ("2026-10-20"). Reads it, creates it on
 * the first request of the day, and re-reads when another instance won the
 * race (409). Cached in memory; older days are evicted when a new one starts.
 */
function createSaltStore(container) {
  const cache = new Map();

  async function load(day) {
    const existing = await readSalt(container, day);
    if (existing) return existing;
    const salt = crypto.randomBytes(32).toString("base64");
    try {
      await container.items.create({
        id: saltId(day),
        type: "salt",
        day,
        salt,
        ttl: SALT_TTL_SECONDS,
      });
      return salt;
    } catch (err) {
      if (err.code !== 409) throw err;
      const winner = await readSalt(container, day);
      if (!winner) throw new Error(`salt for ${day} vanished after a create conflict`);
      return winner;
    }
  }

  // Caches the promise, not the value, so concurrent first requests of a day
  // share one read/create. A failed load is forgotten so the next call retries.
  return function getSalt(day) {
    if (cache.has(day)) return cache.get(day);
    for (const key of cache.keys()) if (key < day) cache.delete(key);
    const pending = load(day);
    cache.set(day, pending);
    pending.catch(() => {
      if (cache.get(day) === pending) cache.delete(day);
    });
    return pending;
  };
}

/** 16 hex chars identifying one visitor on one day. Throws without a salt. */
function visitorHash(salt, { ip, ua, host }) {
  if (!salt) throw new Error("visitorHash needs a salt");
  return crypto
    .createHmac("sha256", salt)
    .update(`${ip || ""}\n${ua || ""}\n${host || ""}`)
    .digest("hex")
    .slice(0, 16);
}

module.exports = { SALT_TTL_SECONDS, createSaltStore, visitorHash };
