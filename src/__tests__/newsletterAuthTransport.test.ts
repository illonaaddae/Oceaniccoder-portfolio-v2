import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// Azure Function helper (CommonJS); vitest only collects tests from src/.
const require = createRequire(import.meta.url);
const { readJwtCandidates, describeTransports } = require("../../api/send-newsletter/index.js");

const OURS = "appwrite.jwt.value";
const AZURE = "azure.principal.token";

describe("readJwtCandidates", () => {
  it("prefers our own header over Authorization", () => {
    /*
     * The bug this encodes: Azure Static Web Apps puts its own principal token
     * in Authorization. Reading that first meant verifying Azure's token
     * against Appwrite, which fails as "Signature failed" — a valid-looking
     * token from the wrong issuer, indistinguishable from a broken session.
     */
    const candidates = readJwtCandidates({
      headers: { authorization: `Bearer ${AZURE}`, "x-appwrite-jwt": OURS },
      body: {},
    });

    expect(candidates[0]).toBe(OURS);
  });

  it("still tries Authorization, so either transport works alone", () => {
    expect(readJwtCandidates({ headers: { authorization: `Bearer ${OURS}` }, body: {} })).toEqual([
      OURS,
    ]);
    expect(readJwtCandidates({ headers: { "x-appwrite-jwt": OURS }, body: {} })).toEqual([OURS]);
  });

  it("falls back to the body, which no hosting layer rewrites", () => {
    const candidates = readJwtCandidates({ headers: {}, body: { jwt: OURS } });
    expect(candidates).toEqual([OURS]);
  });

  it("keeps every distinct candidate so one bad transport cannot block the rest", () => {
    const candidates = readJwtCandidates({
      headers: { authorization: `Bearer ${AZURE}` },
      body: { jwt: OURS },
    });

    expect(candidates).toEqual([OURS, AZURE]);
  });

  it("does not try the same token twice", () => {
    const candidates = readJwtCandidates({
      headers: { authorization: `Bearer ${OURS}`, "x-appwrite-jwt": OURS },
      body: { jwt: OURS },
    });

    expect(candidates).toEqual([OURS]);
  });

  it("ignores an Authorization header that is not a bearer token", () => {
    expect(readJwtCandidates({ headers: { authorization: "Basic abc123" }, body: {} })).toEqual([]);
  });

  it("returns nothing when the request carries no token at all", () => {
    expect(readJwtCandidates({ headers: {}, body: {} })).toEqual([]);
    expect(readJwtCandidates({})).toEqual([]);
  });

  it("trims whitespace picked up in transit", () => {
    expect(readJwtCandidates({ headers: { "x-appwrite-jwt": `  ${OURS}\n` }, body: {} })).toEqual([
      OURS,
    ]);
  });
});

describe("describeTransports", () => {
  it("reports lengths only, never token material", () => {
    const report = describeTransports({
      headers: { authorization: `Bearer ${AZURE}`, "x-appwrite-jwt": OURS },
      body: { jwt: OURS },
    });

    expect(report).toEqual({
      xAppwriteJwt: OURS.length,
      body: OURS.length,
      authorization: `Bearer ${AZURE}`.length,
    });
    expect(JSON.stringify(report)).not.toContain(OURS);
    expect(JSON.stringify(report)).not.toContain(AZURE);
  });

  it("reports zero for transports that carried nothing", () => {
    expect(describeTransports({ headers: {}, body: {} })).toEqual({
      xAppwriteJwt: 0,
      body: 0,
      authorization: 0,
    });
  });
});
